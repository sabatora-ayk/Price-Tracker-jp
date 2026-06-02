import {
  PriceSummary,
  ContentTopic,
  ContentCategory,
  HISTORICAL_EVENTS,
  GENERATION_YEARS,
} from "./types";

// ============================================
// Layer 2: ルールベースのトピック抽出
// AI不要。データから「ネタ」を発見するロジック
// ============================================

export function generateTopics(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  topics.push(...extractAnomalies(summaries));
  topics.push(...extractGenerationComparisons(summaries));
  topics.push(...extractHistoricalComparisons(summaries));
  topics.push(...extractCulprits(summaries));
  topics.push(...extractGeopolitical(summaries));
  topics.push(...extractRankings(summaries));
  topics.push(...extractComparisons(summaries));

  return topics;
}

// ─────────────────────────────────────────
// カテゴリ1: 異常値
// ─────────────────────────────────────────
function extractAnomalies(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  for (const s of summaries) {
    // 過去最高値更新チェック（現在値が過去最大値の95%以上）
    if (s.current_index >= s.max_index * 0.95) {
      topics.push({
        id: `anomaly_max_${s.item_key}`,
        category: "anomaly",
        priority: 9,
        title: `${s.item_name}が過去最高水準`,
        items: [s.item_name],
        data_points: {
          current: s.current_index,
          max: s.max_index,
          max_year: s.max_year,
          base_1970: 100,
        },
        hook: `実は${s.item_name}、今が過去最高水準です。`,
      });
    }

    // 直近10年で20%以上上昇
    if (s.decade_change_pct >= 20) {
      topics.push({
        id: `anomaly_decade_${s.item_key}`,
        category: "anomaly",
        priority: 6,
        title: `${s.item_name}が10年で${Math.round(s.decade_change_pct)}%上昇`,
        items: [s.item_name],
        data_points: {
          change_pct: s.decade_change_pct,
          current: s.current_index,
        },
        hook: `${s.item_name}、たった10年で${Math.round(s.decade_change_pct)}%値上がりしています。`,
      });
    }

    // 1970年比で2倍以上
    if (s.total_change_pct >= 100) {
      topics.push({
        id: `anomaly_total_${s.item_key}`,
        category: "anomaly",
        priority: 7,
        title: `${s.item_name}は50年で${Math.round(s.total_change_pct)}%上昇`,
        items: [s.item_name],
        data_points: {
          base_1970: 100,
          current: s.current_index,
          change_pct: s.total_change_pct,
        },
        hook: `あなたが生まれる前、${s.item_name}は今の半額以下でした。`,
      });
    }
  }

  return topics;
}

// ─────────────────────────────────────────
// カテゴリ2: 世代比較
// ─────────────────────────────────────────
function extractGenerationComparisons(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  for (const gen of GENERATION_YEARS) {
    // 複数品目の世代比較（電気代・卵・食パンの3点セット）
    const keyItems = summaries.filter((s) =>
      ["electricity", "egg", "bread"].includes(s.item_key)
    );

    if (keyItems.length === 0) continue;

    const dataPoints: Record<string, number> = {};
    for (const item of keyItems) {
      const genIndex = getIndexAtYear(item, gen.year);
      if (genIndex) {
        dataPoints[`${item.item_key}_then`] = genIndex;
        dataPoints[`${item.item_key}_now`] = item.current_index;
      }
    }

    topics.push({
      id: `generation_${gen.year}`,
      category: "generation",
          priority: 5,
      title: `${gen.label}の物価 vs 今`,
      items: keyItems.map((s) => s.item_name),
      data_points: dataPoints,
      hook: `${gen.label}の頃、生活コストは今とどう違ったか。`,
    });
  }

  return topics;
}

// ─────────────────────────────────────────
// カテゴリ3: 歴史イベント比較
// ─────────────────────────────────────────
function extractHistoricalComparisons(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  for (const event of HISTORICAL_EVENTS) {
    for (const s of summaries) {
      const eventIndex = getIndexAtYear(s, event.year);
      if (!eventIndex) continue;

      // イベント時より現在の方が高い場合
      if (s.current_index > eventIndex * 1.1) {
        topics.push({
          id: `historical_${event.year}_${s.item_key}`,
          category: "historical",
          priority: 5,
          title: `${s.item_name}が${event.name}時より高い`,
          items: [s.item_name],
          data_points: {
            event_index: eventIndex,
            current_index: s.current_index,
            event_year: event.year,
          },
          hook: `${event.name}より今の方が${s.item_name}は高いです。`,
          historical_event: event.name,
        });
      }
    }
  }

  return topics;
}

// ─────────────────────────────────────────
// カテゴリ4: 犯人探し
// ─────────────────────────────────────────
function extractCulprits(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  // 値上がり率トップ3を「犯人探し」として扱う
  const topGainers = [...summaries]
    .sort((a, b) => b.decade_change_pct - a.decade_change_pct)
    .slice(0, 3);

  for (const s of topGainers) {
    if (s.geopolitical_tags.length > 0) {
      topics.push({
        id: `culprit_${s.item_key}`,
        category: "culprit",
          priority: 8,
        title: `${s.item_name}が高い本当の理由`,
        items: [s.item_name],
        data_points: {
          change_pct: s.decade_change_pct,
          current: s.current_index,
        },
        hook: `${s.item_name}が値上がりした犯人、実は${s.geopolitical_tags[0]}です。`,
        geopolitical_angle: s.geopolitical_tags[0],
      });
    }
  }

  return topics;
}

// ─────────────────────────────────────────
// カテゴリ5: 地政学
// ─────────────────────────────────────────
function extractGeopolitical(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  // タグ別にグループ化
  const tagGroups: Record<string, PriceSummary[]> = {};
  for (const s of summaries) {
    for (const tag of s.geopolitical_tags) {
      if (!tagGroups[tag]) tagGroups[tag] = [];
      tagGroups[tag].push(s);
    }
  }

  for (const [tag, items] of Object.entries(tagGroups)) {
    if (items.length < 2) continue;

    topics.push({
      id: `geopolitical_${tag.replace(/\s/g, "_")}`,
      category: "geopolitical",
          priority: 7,
      title: `${tag}に依存する食品リスト`,
      items: items.map((s) => s.item_name),
      data_points: Object.fromEntries(
        items.map((s) => [s.item_key, s.current_index])
      ),
      hook: `実は日本のこれらの食品、${tag}に依存しています。`,
      geopolitical_angle: tag,
    });
  }

  return topics;
}

// ─────────────────────────────────────────
// カテゴリ6: ランキング
// ─────────────────────────────────────────
function extractRankings(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  // 50年で最も上昇した品目TOP5
  const topGainers = [...summaries]
    .sort((a, b) => b.total_change_pct - a.total_change_pct)
    .slice(0, 5);

  topics.push({
    id: "ranking_top_gainers_50y",
    category: "ranking",
          priority: 6,
    title: "50年で最も値上がりした食品TOP5",
    items: topGainers.map((s) => s.item_name),
    data_points: Object.fromEntries(
      topGainers.map((s) => [s.item_key, s.total_change_pct])
    ),
    hook: "50年間で最も値上がりした食品、知っていますか？",
  });

  // 最も安定していた品目TOP5
  const mostStable = [...summaries]
    .sort((a, b) => Math.abs(a.total_change_pct) - Math.abs(b.total_change_pct))
    .slice(0, 5);

  topics.push({
    id: "ranking_most_stable",
    category: "ranking",
          priority: 6,
    title: "50年で最も安定していた食品TOP5",
    items: mostStable.map((s) => s.item_name),
    data_points: Object.fromEntries(
      mostStable.map((s) => [s.item_key, s.total_change_pct])
    ),
    hook: "意外。50年間ほとんど値上がりしていない食品があります。",
  });

  // 直近10年の値上がりランキング
  const recentGainers = [...summaries]
    .sort((a, b) => b.decade_change_pct - a.decade_change_pct)
    .slice(0, 5);

  topics.push({
    id: "ranking_recent_gainers",
    category: "ranking",
          priority: 6,
    title: "直近10年で最も値上がりした食品TOP5",
    items: recentGainers.map((s) => s.item_name),
    data_points: Object.fromEntries(
      recentGainers.map((s) => [s.item_key, s.decade_change_pct])
    ),
    hook: `ここ10年で最も苦しくなった食品は${recentGainers[0]?.item_name}です。`,
  });

  return topics;
}

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────

// ※実際の実装ではSupabaseから年別データを取得する
// ここではPriceSummaryに含まれる代表値を使う簡易版
function getIndexAtYear(summary: PriceSummary, year: number): number | null {
  if (year <= 1970) return summary.index_1970;
  if (year <= 1990) return summary.index_1990;
  if (year <= 2000) return summary.index_2000;
  if (year <= 2010) return summary.index_2010;
  if (year <= 2020) return summary.index_2020;
  return summary.current_index;
}

// ——————————————————————————————
// カテゴリ7: 品目間比較
// ——————————————————————————————
function extractComparisons(summaries: PriceSummary[]): ContentTopic[] {
  const topics: ContentTopic[] = [];

  const sorted = [...summaries].sort(
    (a, b) => (b.decade_change_pct ?? 0) - (a.decade_change_pct ?? 0)
  );

  // 上位3ペアを比較トピックとして生成
  for (let i = 0; i < Math.min(sorted.length - 1, 3); i++) {
    const a = sorted[i];
    const b = sorted[i + 1];

    topics.push({
      id: `comparison_${a.item_key}_vs_${b.item_key}`,
      category: "comparison",
      priority: 6,
      title: `${a.item_name} vs ${b.item_name}、値上がり対決`,
      items: [a.item_name, b.item_name],
      data_points: {
        [`${a.item_key}_change`]: a.decade_change_pct,
        [`${b.item_key}_change`]: b.decade_change_pct,
      },
      hook: `${a.item_name}と${b.item_name}、どっちが家計を直撃しているか？`,
    });
  }

  return topics;
}
