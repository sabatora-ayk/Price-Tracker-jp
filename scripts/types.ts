// ============================================
// Price Tracker Content Engine - 型定義
// ============================================

export type ContentCategory =
  | "anomaly"        // 異常値「50年で最も上がった食品」
  | "generation"     // 世代比較「父が20歳の時 vs 今」
  | "historical"     // 歴史イベント「オイルショック時と比較」
  | "culprit"        // 犯人探し「なぜ高い？」
  | "geopolitical"   // 地政学「中国90%依存」
  | "ranking"
  | "comparison";       // ランキング「最も安定していた食品」

export type Platform = "x" | "tiktok" | "shorts";

// Supabaseから取得する価格データの型
// ※実際のテーブル構造に合わせて修正してください
export interface PriceRecord {
  item_name: string;       // 品目名（例："卵"）
  item_key: string;        // キー（例："egg"）
  year: number;
  month?: number;
  index_value: number;     // CPI指数（1970年=100）
  geopolitical_tags?: string[];  // 例: ["中東LNG", "ロシア依存"]
}

export interface PriceSummary {
  item_key: string;
  item_name: string;
  current_index: number;
  index_1970: number;
  index_1990: number;
  index_2000: number;
  index_2010: number;
  index_2020: number;
  max_index: number;
  max_year: number;
  min_index: number;
  min_year: number;
  total_change_pct: number;     // 1970年比の変化率(%)
  decade_change_pct: number;    // 直近10年の変化率(%)
  geopolitical_tags: string[];
}

export interface ContentTopic {
  id: string;
  priority: number;
  category: ContentCategory;
  title: string;                // 例："電気代がオイルショック超え"
  items: string[];              // 関連品目
  data_points: Record<string, number>;  // グラフ用数値
  hook: string;                 // 冒頭フック文
  geopolitical_angle?: string;  // 地政学アングル
  historical_event?: string;    // 関連する歴史イベント
}

export interface GeneratedContent {
  topic: ContentTopic;
  x_post: string;               // X投稿文（140字以内）
  tiktok_script: string;        // TikTok台本（15〜30秒）
  shorts_script: string;        // Shorts台本（TikTokと同じでOK）
  generated_at: string;
  status: "draft" | "approved" | "posted";
}

// 歴史イベントの定義
export const HISTORICAL_EVENTS = [
  { year: 1973, name: "第一次オイルショック" },
  { year: 1979, name: "第二次オイルショック" },
  { year: 1991, name: "バブル崩壊" },
  { year: 1997, name: "アジア通貨危機" },
  { year: 2008, name: "リーマンショック" },
  { year: 2011, name: "東日本大震災" },
  { year: 2020, name: "コロナショック" },
  { year: 2022, name: "ウクライナ戦争・円安" },
] as const;

// 世代比較の定義
export const GENERATION_YEARS = [
  { label: "団塊世代が20歳", year: 1968 },
  { label: "バブル世代が20歳", year: 1988 },
  { label: "就職氷河期世代が20歳", year: 1998 },
  { label: "ゆとり世代が20歳", year: 2008 },
  { label: "Z世代が20歳", year: 2022 },
] as const;
