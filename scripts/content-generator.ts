import { ContentTopic, GeneratedContent, Platform } from "./types";

// ============================================
// Layer 3: AI生成
// Claude APIでX投稿・TikTok台本を生成する
// ============================================

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// 7日間のローテーション（曜日ごとにカテゴリを固定）
const WEEKDAY_CATEGORY_MAP: Record<number, string> = {
  0: "ranking",      // 日
  1: "anomaly",      // 月
  2: "culprit",      // 火
  3: "generation",   // 水
  4: "geopolitical", // 木
  5: "historical",   // 金
  6: "ranking",      // 土（週サマリー）
};

export async function generateContent(
  topic: ContentTopic,
  apiKey: string
): Promise<GeneratedContent> {
  const prompt = buildPrompt(topic);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
},
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text(); console.error("API Error body:", errBody); throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json() as any;
  const text = data.content[0]?.text ?? "";

  return parseGeneratedContent(topic, text);
}

// ─────────────────────────────────────────
// プロンプト構築
// ─────────────────────────────────────────
function buildPrompt(topic: ContentTopic): string {
  return `
あなたは日本の物価・地政学リスクを発信するSNSアカウントの編集者です。

以下のデータからSNS投稿を生成してください。

## トピック
タイトル: ${topic.title}
カテゴリ: ${topic.category}
関連品目: ${topic.items.join("、")}
フック: ${topic.hook}
${topic.geopolitical_angle ? `地政学アングル: ${topic.geopolitical_angle}` : ""}
${topic.historical_event ? `歴史イベント: ${topic.historical_event}` : ""}

## データ
${JSON.stringify(topic.data_points, null, 2)}

## 生成ルール
- 政治的中立を保つ（特定政党への言及なし）
- 感情に刺さるが煽らない
- 数字は具体的に
- 出典はPrice Tracker Japanを明示
- URLは [URL] と書いてください

## 出力形式（必ずこの形式で）

===X_POST===
（140字以内。改行あり。最後に #物価 #日本経済 のハッシュタグ）

===TIKTOK_SCRIPT===
（15〜30秒。ナレーション形式。
冒頭3秒で引き込む。
中盤でデータ提示。
最後にサイト誘導。）

===END===
`;
}

// ─────────────────────────────────────────
// レスポンスのパース
// ─────────────────────────────────────────
function parseGeneratedContent(
  topic: ContentTopic,
  text: string
): GeneratedContent {
  const xPost = extractSection(text, "X_POST", "TIKTOK_SCRIPT") ?? "（生成失敗）";
  const tiktokScript = extractSection(text, "TIKTOK_SCRIPT", "END") ?? "（生成失敗）";

  return {
    topic,
    x_post: xPost.trim(),
    tiktok_script: tiktokScript.trim(),
    shorts_script: tiktokScript.trim(), // ShortsはTikTokと同一
    generated_at: new Date().toISOString(),
    status: "draft",
  };
}

function extractSection(
  text: string,
  startTag: string,
  endTag: string
): string | null {
  const start = text.indexOf(`===${startTag}===`);
  const end = text.indexOf(`===${endTag}===`);
  if (start === -1 || end === -1) return null;
  return text.slice(start + startTag.length + 6, end).trim();
}

// ─────────────────────────────────────────
// 今日の投稿カテゴリを返す
// ─────────────────────────────────────────
export function getTodayCategory(): string {
  const weekday = new Date().getDay();
  return WEEKDAY_CATEGORY_MAP[weekday] ?? "anomaly";
}
