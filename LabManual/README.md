# SIer 体験研修 ハンズオン手順書

CTC FY26 インターンシップ SIer 体験研修で使用するハンズオン手順書です。
Azure 上に 1 人 1 環境（VNet + VM）を構築し、nginx で生成 AI チャットサイトを公開するまでを扱います。

## 手順書一覧

| Lab | タイトル | 内容 | 推定時間 |
|---|---|---|---|
| [Lab01](./Lab01_ResourceGroupAndNetwork.md) | リソース グループ・ネットワークの作成 | リソースグループ、VNet、NSG の作成と受信規則の追加 | 60分 |
| [Lab02](./Lab02_CreateVirtualMachine.md) | 仮想マシンの作成と接続 | VM の作成、PowerShell での SSH 接続 | 60分 |
| [Lab03](./Lab03_BuildWebServer.md) | Web サーバーの構築 | nginx の導入、サンプルチャットサイトの配置 | 40分 |
| Lab04 | AI Foundry の作成と接続 | 準備中（CORS実機確認・config.js編集方法が未確定） | - |

## 前提条件

- Azure Portal にサインイン可能なアカウント
- ローカル PC（Windows、PowerShell 使用）
- リソース名は `rg-intern-YYMMDD-NN` 形式（`YYMMDD` は実施日、`NN` はチーム番号）に置き換えて進めてください
- VM のユーザー名は `azureuser`、パスワードは講師の指示に従ってください

## 表記ルール

- `「 」`：画面名・項目名・メッセージ
- `[ ]`：クリック対象（ボタン・タブ・リンク）
- 「注：」から始まる引用ブロック：補足説明

## サンプルチャットサイトについて

Lab03 で配置するチャットサイトは、[`../sampleChatbotSite`](../sampleChatbotSite) に置いています。
`config.js` の3か所（`ENDPOINT`・`DEPLOYMENT`・`API_KEY`）を、Lab04 で作成する AI Foundry の情報に書き換えることで動作します。
