@AGENTS.md
# CLAUDE.md - price-tracker-jp

## このファイルについて
Claude CodeがこのリポジトリでAIエージェントとして動く際に
必ず読み込む指示書です。全ての指示に従ってください。

## プロジェクト概要
日本の「見えない価格変動」を追跡するダッシュボード。
地政学リスクと連動した13品目の実質価格変動を可視化する。

## 追跡対象13品目
01 電気代（中東LNG依存）
02 食パン
03 牛乳
04 卵
05 豆腐
06 マヨネーズ
07 インスタント麺
08 ニンニク（中国依存90%）
09 たらこ（ロシア依存）
10 鶏もも肉
11 小麦粉（ロシア肥料経由）
12 肥料コスト指標
13 ペットボトル水

## 技術スタック
- Frontend: Next.js 16 + TypeScript + Tailwind
- DB: Supabase（dev環境のみ）
- CI/CD: GitHub Actions
- Deploy: Vercel（未設定）

## 絶対禁止事項（違反したらPRを即却下）
- mainブランチへの直接push・merge
- .env.localへの秘密鍵の記載
- production DBへの直接接続
- sudo・rm -rfの使用
- AIが生成したコードをレビューなしでmainにmerge
- node_modulesのcommit

## コード生成ルール
- TypeScriptの型を必ず付ける
- anyは使用禁止
- console.logはデバッグ後に必ず削除
- コメントは日本語で書く

## 出力・表示ルール
- 事実とデータのみ表示する
- 「今すぐ買え」等の投資・購買助言は絶対に出力しない
- AI生成テキストには「⚠️AI生成・未検証」を表示する
- 依存国タグを全品目に表示する

## セキュリティルール
- 公開可能キー（sb_publishable_）のみフロントで使用可
- 秘密鍵はGitHub Secretsのみで管理
- RLSを全テーブルで有効にする

## PRレビュー基準
以下が全部通っていないとmerge禁止：
- lint
- typecheck
- test

## Human Escalationルール
以下は必ず人間に判断を戻す：
- DBスキーマの変更
- 認証・権限まわりの変更
- 外部APIキーの追加
- コスト影響がある変更
