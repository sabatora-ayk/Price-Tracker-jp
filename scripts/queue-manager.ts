import * as fs from "fs";
import * as path from "path";
import { GeneratedContent, ContentTopic } from "./types";

// ============================================
// Layer 4: Queue & 在庫管理
// ============================================

const CONTENT_DIR = path.join(process.cwd(), "content");
const QUEUE_FILE = path.join(process.cwd(), "content", "queue.json");
export interface QueueEntry {
  id: string;
  file: string;
  category: string;
  title: string;
  scheduled_date?: string;
  status: "draft" | "approved" | "posted";
}

// ─────────────────────────────────────────
// Markdownとして保存
// ─────────────────────────────────────────
export function saveContent(content: GeneratedContent): string {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const date = jst.toISOString().slice(0, 10);
  const filename = `${date}-${content.topic.id}.md`;
  const filepath = path.join(CONTENT_DIR, filename);

  const markdown = buildMarkdown(content);
  fs.writeFileSync(filepath, markdown, "utf-8");

  return filepath;
}

function buildMarkdown(content: GeneratedContent): string {
  return `---
id: ${content.topic.id}
category: ${content.topic.category}
title: ${content.topic.title}
items: ${content.topic.items.join(", ")}
generated_at: ${content.generated_at}
status: ${content.status}
---

# ${content.topic.title}

## X投稿案

${content.x_post}

---

## TikTok台本

${content.tiktok_script}

---

## Shorts台本

${content.shorts_script}

---

## データ参照

\`\`\`json
${JSON.stringify(content.topic.data_points, null, 2)}
\`\`\`

<!-- レビューメモ欄 -->
## レビューメモ

- [ ] 数字に誤りがないか確認
- [ ] 政治的中立を確認
- [ ] 投稿タイミングに問題がないか確認（災害・事故等）
- [ ] URL差し替え済みか確認
`;
}

// ─────────────────────────────────────────
// Queue管理
// ─────────────────────────────────────────
export function addToQueue(content: GeneratedContent, filepath: string): void {
  const queue = loadQueue();

  const entry: QueueEntry = {
    id: content.topic.id,
    file: path.basename(filepath),
    category: content.topic.category,
    title: content.topic.title,
    status: "draft",
  };

  // 重複チェック
  if (!queue.find((e) => e.id === entry.id)) {
    queue.push(entry);
    saveQueue(queue);
  }
}

export function loadQueue(): QueueEntry[] {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  const raw = fs.readFileSync(QUEUE_FILE, "utf-8");
  return JSON.parse(raw);
}

function saveQueue(queue: QueueEntry[]): void {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
}

// ─────────────────────────────────────────
// 在庫レポート
// ─────────────────────────────────────────
export function getInventoryReport(): {
  total: number;
  draft: number;
  approved: number;
  posted: number;
  days_remaining: number;
} {
  const queue = loadQueue();
  const draft = queue.filter((e) => e.status === "draft").length;
  const approved = queue.filter((e) => e.status === "approved").length;
  const posted = queue.filter((e) => e.status === "posted").length;

  return {
    total: queue.length,
    draft,
    approved,
    posted,
    days_remaining: draft + approved, // 1日1本想定
  };
}
