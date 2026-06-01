import { generateTopics } from "./topic-extractor";
import { generateContent, getTodayCategory } from "./content-generator";
import { saveContent, addToQueue, getInventoryReport } from "./queue-manager";
import { PriceSummary } from "./types";
import { createClient } from "@supabase/supabase-js";


// Supabaseクライアント初期化
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!  // SUPABASE_ANON_KEY! から変更
);
// price_recordsテーブルの生データ型（lib/supabase.tsのPriceRecordと一致）
interface RawPriceRecord {
  id: string;
  item_code: string;
  item_name: string;
  price: number;
  unit: string;
  recorded_at: string;        // "2024-01" 形式
  source: string;
  dependency_country: string | null;
  created_at: string;
}

// item_codeからitem_keyへのマッピング（page.tsxのITEM_NAMESに対応）
const ITEM_CODE_TO_KEY: Record<string, string> = {
  "3500": "electricity",
  "1021": "bread",
  "1303": "milk",
  "1341": "egg",
  "1471": "tofu",
  "1643": "mayonnaise",
  "1051": "cup_noodle",
  "0022": "fresh_vegetable",
  "1142": "tarako",
  "1221": "chicken",
  "1071": "flour",
  "1982": "mineral_water",
};

// ============================================
// メインエントリーポイント
//
// 使い方:
//   npx ts-node src/main.ts --mode=inventory  # 初回: 全トピック在庫生成
//   npx ts-node src/main.ts --mode=daily      # 毎日: 今日分を3本生成
//   npx ts-node src/main.ts --mode=report     # 在庫状況確認
// ============================================

async function main() {
  const mode = process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1] ?? "daily";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (mode !== "report" && !apiKey) {
    console.error("❌ ANTHROPIC_API_KEY が設定されていません");
    process.exit(1);
  }

  // ─────────────────────────────────────────
  // Supabaseからデータ取得
  // ※実際の実装ではここをSupabaseクライアントに差し替えてください
  // ─────────────────────────────────────────
  const summaries = await fetchPriceSummaries();

  if (mode === "report") {
    const report = getInventoryReport();
    console.log("\n📊 在庫レポート");
    console.log(`  合計: ${report.total}本`);
    console.log(`  下書き: ${report.draft}本`);
    console.log(`  承認済み: ${report.approved}本`);
    console.log(`  投稿済み: ${report.posted}本`);
    console.log(`  残り在庫: ${report.days_remaining}日分`);
    if (report.days_remaining < 14) {
      console.warn("\n⚠️  在庫が14日を下回っています。--mode=inventory で補充してください");
    }
    return;
  }

  // 全トピックを抽出
  const allTopics = generateTopics(summaries);
  console.log(`\n🔍 ${allTopics.length}件のトピックを発見`);

  if (mode === "inventory") {
    // 初回: 全トピック生成（90日分在庫）
    console.log("📦 在庫生成モード: 全トピックを生成します...\n");
    let generated = 0;

    for (const topic of allTopics) {
      try {
        console.log(`  生成中: ${topic.title}`);
        const content = await generateContent(topic, apiKey!);
        const filepath = saveContent(content);
        addToQueue(content, filepath);
        generated++;

        // APIレート制限対策
        await sleep(1000);
      } catch (err) {
        console.error(`  ❌ 失敗: ${topic.title}`, err);
      }
    }

    console.log(`\n✅ ${generated}本生成完了`);

  } else if (mode === "daily") {
    // 日次: 今日のカテゴリで3本生成
    const todayCategory = getTodayCategory();
    const todayTopics = allTopics
      .filter((t) => t.category === todayCategory)
      .slice(0, 3);

    console.log(`📅 日次モード: カテゴリ=${todayCategory}, ${todayTopics.length}本生成\n`);

    for (const topic of todayTopics) {
      try {
        console.log(`  生成中: ${topic.title}`);
        const content = await generateContent(topic, apiKey!);
        const filepath = saveContent(content);
        addToQueue(content, filepath);
        await sleep(1000);
      } catch (err) {
        console.error(`  ❌ 失敗: ${topic.title}`, err);
      }
    }

    // 在庫警告
    const report = getInventoryReport();
    if (report.days_remaining < 14) {
      console.warn("\n⚠️  在庫が14日を下回っています！");
    }
  }

  console.log("\n✅ 完了。content/ フォルダを確認してください。");
}

// ─────────────────────────────────────────
// price_records テーブルから PriceSummary を構築
// ─────────────────────────────────────────
async function fetchPriceSummaries(): Promise<PriceSummary[]> {
  console.log("📡 Supabase から price_records を取得中...");

  const { data, error } = await supabase
    .from("price_records")
    .select("item_code, item_name, price, recorded_at, dependency_country")
    .order("recorded_at", { ascending: true });

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!data || data.length === 0) throw new Error("price_records にデータがありません");

  const rows = data as RawPriceRecord[];
  console.log(`  ${rows.length}件取得`);

  // item_codeでグループ化
  const grouped = new Map<string, RawPriceRecord[]>();
  for (const row of rows) {
    if (!grouped.has(row.item_code)) grouped.set(row.item_code, []);
    grouped.get(row.item_code)!.push(row);
  }

  const summaries: PriceSummary[] = [];

  for (const [itemCode, records] of grouped.entries()) {
    const sorted = records
      .filter((r) => r.price > 0)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

    if (sorted.length === 0) continue;

    const current = sorted[sorted.length - 1].price;
    const first = sorted[0];
    const itemName = first.item_name;
    const itemKey = ITEM_CODE_TO_KEY[itemCode] ?? itemCode;

    // 各年代の代表値（その年以前で最も近いレコード）
    const getIndexAt = (year: number) => {
      const target = `${year}-12`;
      const found = [...sorted].reverse().find((r) => r.recorded_at <= target);
      return found?.price ?? sorted[0].price;
    };

    const index1970 = getIndexAt(1970);
    const index1990 = getIndexAt(1990);
    const index2000 = getIndexAt(2000);
    const index2010 = getIndexAt(2010);
    const index2020 = getIndexAt(2020);

    const prices = sorted.map((r) => r.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const maxYear = parseInt(sorted.find((r) => r.price === maxPrice)?.recorded_at ?? "0");
    const minYear = parseInt(sorted.find((r) => r.price === minPrice)?.recorded_at ?? "0");

    const decadeAgo = getIndexAt(new Date().getFullYear() - 10);

    // dependency_countryはカンマ区切りの可能性あり → 配列に変換
    const geoTags = first.dependency_country
      ? first.dependency_country.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    summaries.push({
      item_key: itemKey,
      item_name: itemName,
      current_index: current,
      index_1970: index1970,
      index_1990: index1990,
      index_2000: index2000,
      index_2010: index2010,
      index_2020: index2020,
      max_index: maxPrice,
      max_year: maxYear,
      min_index: minPrice,
      min_year: minYear,
      total_change_pct: index1970 > 0
        ? Math.round(((current - index1970) / index1970) * 100)
        : 0,
      decade_change_pct: decadeAgo > 0
        ? Math.round(((current - decadeAgo) / decadeAgo) * 100)
        : 0,
      geopolitical_tags: geoTags,
    });
  }

  console.log(`  ${summaries.length}品目のサマリーを生成`);
  return summaries;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("❌ 予期せぬエラー:", err);
  process.exit(1);
});
