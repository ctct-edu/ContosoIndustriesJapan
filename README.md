# ContosoIndustriesJapan

SIer 体験研修「ContosoIndustriesJapan」というお題（架空の製造業クライアント想定シナリオ）の、演習手順およびサンプルデータの置き場です。

## フォルダー構成

| フォルダー | 内容 |
|---|---|
| [`LabManual`](./LabManual) | 演習手順（Lab01、Lab02…）。Azure 環境の構築から Web サーバー構築までを扱います |
| [`sampleChatbotSite`](./sampleChatbotSite) | 演習内で配置する、生成 AI チャットサイトのサンプルデータ一式 |

## 演習の流れ

1. `LabManual` の Lab01 から順に進めます。詳細は [`LabManual/README.md`](./LabManual/README.md) を参照してください。
2. Lab03 で、`sampleChatbotSite` の中身を自分の VM 上の nginx に配置します。
3. Lab04（準備中）で Azure AI Foundry を構築し、`sampleChatbotSite/config.js` に接続情報を設定します。
