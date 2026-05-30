<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md - price-tracker-jp

## このファイルについて
Codex・Claude Code・GitHub Copilot等の全AIエージェントが
このリポジトリで動く際に必ず読み込む指示書です。

## AI役割分担
Claude Code：設計レビュー・セキュリティ確認・コードレビュー
Codex/GPT ：実装・テスト・lint修正・型修正
GitHub Actions：CI自動実行（lint/typecheck/test）

## 全AIへの共通禁止事項
- mainへの直接push禁止
- 秘密鍵・APIキーをコードに書くこと禁止
- production DB接続禁止
- sudo・rm -rf禁止
- anyの使用禁止
- node_modulesのcommit禁止
- レビューなしのmerge禁止

## 作業フロー（必ず守る）
AI実装 → PR作成 → CI通過 → Human Review → merge

## 参照必須ファイル
作業前に必ず以下を読むこと：
- CLAUDE.md（プロジェクト仕様）
- SECURITY.md（セキュリティルール）
- docs/adr/（設計決定記録）
- AI-OPERATIONS-CONSTITUTION.md（最高規範）

## 憲法違反の判定
以下は即作業停止してHumanに報告：
- 秘密情報がコードに含まれている
- テストなしの実装
- 権限分離の違反
- 本番環境への影響がある変更
