# 投稿画面 セットアップ手順

設計は [editor-design.md](editor-design.md)。ここでは本番で動かすまでの作業を書く。

## 全体

| 部品 | 役割 | 設定先 |
|---|---|---|
| Cloudflare D1 `kobo-editor` | メンバー・パスキー公開鍵・ログイン状態・操作記録 | Cloudflare |
| GitHub App `kobo-editor-bot` | 記事と画像を main にコミット | GitHub |
| Vercel 環境変数 | 上の2つの接続情報 | Vercel |

## 1. D1 を作る（Mac の ~/Desktop/kobo で）

```sh
npx wrangler d1 create kobo-editor
npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0001_init.sql
npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0002_activity.sql
```

`db/editor/migrations/` にファイルが増えたら、番号の順に同じコマンドで実行する（ローカルの SQLite は起動時に自動で適用される）。

1行目の出力にある `database_id` を控える。

## 2. D1 用の API トークンを作る

Cloudflare ダッシュボード → 右上のアイコン → My Profile → API Tokens → Create Token → Create Custom Token

- 名前: `kobo-editor-d1`
- Permissions: Account / D1 / Edit
- Account Resources: 使っているアカウントのみ

作成後に表示されるトークンを控える。アカウント ID はダッシュボードのアカウントのホームの右側（Account ID）。

## 3. GitHub App を作る

GitHub → Settings → Developer settings → GitHub Apps → New GitHub App

- GitHub App name: `kobo-editor-bot`（使われていれば末尾に何か足す）
- Homepage URL: `https://kobo-rits.vercel.app`
- Webhook: Active のチェックを外す
- Repository permissions → Contents: Read and write（Metadata: Read-only は自動）
- Where can this GitHub App be installed?: Only on this account

作成後:

1. ページ上部の App ID を控える
2. 下の Private keys → Generate a private key。`.pem` がダウンロードされる
3. 左メニュー Install App → 自分のアカウントの Install → Only select repositories → `kobo`
4. インストール後のURL `https://github.com/settings/installations/<数字>` の数字が Installation ID

## 4. main のルールに例外を追加する

main にはルールセット「AntiUsui」があり、管理者以外は更新できない。投稿画面から書き込めるように App を例外にする。

GitHub の kobo リポジトリ → Settings → Rules → Rulesets → AntiUsui → Bypass list → Add bypass → `kobo-editor-bot` を選んで Always allow → Save changes

## 5. Vercel に環境変数を入れる

Vercel → kobo プロジェクト → Settings → Environment Variables（Environment は Production）

| 名前 | 値 |
|---|---|
| `EDITOR_ORIGIN` | `https://kobo-rits.vercel.app` |
| `CLOUDFLARE_ACCOUNT_ID` | 手順2のアカウント ID |
| `EDITOR_D1_DATABASE_ID` | 手順1の database_id |
| `EDITOR_D1_API_TOKEN` | 手順2のトークン |
| `EDITOR_GITHUB_APP_ID` | 手順3の App ID |
| `EDITOR_GITHUB_INSTALLATION_ID` | 手順3の Installation ID |
| `EDITOR_GITHUB_PRIVATE_KEY` | `.pem` の中身をそのまま貼る（複数行のままでよい） |
| `EDITOR_GITHUB_REPO` | `Maki-Rin/kobo` |

入れたら再デプロイする。`.pem` は Vercel に入れたら手元から消してよい（必要になれば作り直せる）。

## 6. 最初のまとめ役を招待する（Mac の ~/Desktop/kobo で）

```sh
EDITOR_ORIGIN=https://kobo-rits.vercel.app \
CLOUDFLARE_ACCOUNT_ID=<アカウントID> \
EDITOR_D1_DATABASE_ID=<database_id> \
EDITOR_D1_API_TOKEN=<トークン> \
npm run editor:invite -- --name "名前" --role developer
```

表示されたURLを自分のスマホかPCで開き、パスキーを作る。以後の招待は投稿画面の「メンバー」から行う。

## 運用上の注意

- 投稿画面の保存は main に直接コミットされ、Vercel が1〜2分で反映する。
- 開発作業（develop など）を main に入れる前に、main を取り込む（`git merge origin/main`）。投稿画面の変更は main にしかない。
- パスキーはドメインに結び付く。独自ドメインに移ると、登録済みのパスキーは使えなくなり、全員の再登録（まとめ役が「端末を追加するリンク」を配る）が必要。
- Vercel のプレビューURLではパスキーが使えない（本番ドメイン専用）。
- 投稿画面から書けるのは `src/content/articles/*.md` と `public/images/articles/` だけ。

## ローカルで試す

`.env.local` に次を入れて `npm run dev`。

```
EDITOR_SQLITE_PATH=.editor-local/editor.db
EDITOR_ORIGIN=http://localhost:3000
```

- データベースは `.editor-local/editor.db`（SQLite）に作られる。
- 保存は GitHub ではなく作業ツリーのファイルに直接書かれ、履歴は `.editor-local/history.json` に残る。
- 招待: `npm run editor:invite -- --name "テスト"`
