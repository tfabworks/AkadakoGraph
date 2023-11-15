# TFabGraph[AkaDako版]

## ビルド手順

<details>
<summary>yarn の場合</summary>

```
# インストール
yarn

# ローカルサーバー
yarn serve

# ビルド
yarn build

# テスト
yarn test

### リント&フォーマット
yarn lint
```
</details>
<details open>
<summary>bun の場合</summary>

```
# インストール
bun install

# ローカルサーバー
bun run serve

# ビルド
bun run build

# テスト
bun run test

### リント&フォーマット
bun run lint
```
</details>

## デプロイ
- 本番環境
    - main ブランチに merge または push
    - [Github Actions](https://github.com/tfabworks/AkadakoGraph/actions/)が実行されてS3へデプロイされる
    - https://graph.akadako.com で確認
- 試験環境
    - develop ブランチを push
    - [Github Actions](https://github.com/tfabworks/AkadakoGraph/actions/)が実行されてS3へデプロイされる
    - https://test-graph.akadako.com/ で確認
- ローカル環境
    - `bun run bun-serve` を実行
    - http://localhost:3000

# Tips
## デプロイされているファイルのアーカイブを取得する
- 直近のビルドで `actions/upload-artifact` により作成された Artifact 一覧が以下コマンドで得られる
    - `gh api /repos/tfabworks/AkadakoGraph/actions/artifacts`
- created_at や workflow_run の情報を確認して欲しいartifactの `archive_download_url` に対して更にAPIを実行する
    - `archive_download_url` のレスポンスは zip ファイルのバイナリなのでターミナルに出力されないようファイルにリダイレクトするなどを注意する
    - 例: `gh api /repos/tfabworks/AkadakoGraph/actions/artifacts/1050880148/zip > artifact.zip`
