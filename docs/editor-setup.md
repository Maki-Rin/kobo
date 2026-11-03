# 投稿画面 セットアップ手順

設計は [editor-design.md](editor-design.md)。ここでは本番で動かすまでの作業を書く。

## 全体

| 部品 | 役割 | 設定先 |
|---|---|---|
| Cloudflare D1 `kobo-editor` | メンバー・パスキー公開鍵・ログイン状態・操作記録・下書き・公開前の画像 | Cloudflare |
| GitHub App `kobo-editor-bot` | 記事と画像を main にコミット | GitHub |
| Vercel 環境変数 | 上の2つの接続情報 | Vercel |

## 1. D1 を作る（Mac の ~/Desktop/kobo で）

```sh
npx wrangler d1 create kobo-editor
npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0001_init.sql
npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0002_activity.sql
npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0003_entry_collection.sql
npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0004_security.sql
npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0005_drafts.sql
```

`db/editor/migrations/` にファイルが増えたら、番号の順に同じコマンドで実行する（ローカルの SQLite は起動時に自動で適用される）。

既存の本番DBで0001〜0004を適用済みなら、今回の下書き分離版をデプロイする前に0005だけ適用する。0005はテーブル追加のみで、既存のメンバーや記事は変更しない。新しい環境変数は不要。

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

「Restrict updates」が有効なときは、投稿用GitHub AppをBypass listに追加しないと記事・作品・イベント・人物の保存が拒否される。Repository administratorsだけの例外ではBotは保存できない。投稿はmainへ直接コミットするため、Appの例外は「For pull requests only」ではなく「Always allow」にする。App名を変更して作成した場合はそのAppを選ぶ。

## 5. Vercel に環境変数を入れる

Vercel → kobo プロジェクト → Settings → Environment Variables（Environment は Production）

| 名前 | 値 |
|---|---|
| `EDITOR_ORIGIN` | `https://kobo-rits.vercel.app` |
| `EDITOR_RATE_LIMIT_SECRET` | 暗号学的にランダムな32文字以上の値。Secretとして登録 |
| `CLOUDFLARE_ACCOUNT_ID` | 手順2のアカウント ID |
| `EDITOR_D1_DATABASE_ID` | 手順1の database_id |
| `EDITOR_D1_API_TOKEN` | 手順2のトークン |
| `EDITOR_GITHUB_APP_ID` | 手順3の App ID |
| `EDITOR_GITHUB_INSTALLATION_ID` | 手順3の Installation ID |
| `EDITOR_GITHUB_PRIVATE_KEY` | `.pem` の中身をそのまま貼る（複数行のままでよい） |
| `EDITOR_GITHUB_REPO` | `Maki-Rin/kobo` |

入れたら再デプロイする。`.pem` は Vercel に入れたら手元から消してよい（必要になれば作り直せる）。

## 6. 最初の管理者を招待する（Mac の ~/Desktop/kobo で）

```sh
EDITOR_ORIGIN=https://kobo-rits.vercel.app \
CLOUDFLARE_ACCOUNT_ID=<アカウントID> \
EDITOR_D1_DATABASE_ID=<database_id> \
EDITOR_D1_API_TOKEN=<トークン> \
npm run editor:invite -- --name "名前" --role developer
```

表示されたURLを自分のスマホかPCで開き、パスキーを作る。以後の招待は投稿画面の「メンバー」から行う。

## 運用上の注意

- 下書き保存はD1に保存し、mainへのコミットやVercelの本番デプロイを起こさない。入力中の自動保存は引き続きブラウザ内。
- 「公開する」「更新を確定」と非公開への切り替えはmainへ直接コミットし、Vercelが反映する。人物情報の保存も公開用JSONの更新としてコミットする。内容が同じなら新しいコミットを作らない。
- 公開済み記事の下書き保存では、サイトに出ている版を維持する。下書きは最新1版をD1で共有し、競合時には保存を止める。公開版が変わった場合は比較・退避してから、設定の「下書きを破棄」で古い下書きを片付けて最新の版から編集し直せる。
- 公開前の画像はD1に512KiB単位で分割して一時保存する。1枚3MiB、元データ合計200MiBを上限にし、Base64・DB管理情報の分だけ実際のDB使用量は増える。下書きから参照されない画像は30日経過後、次回アップロード時に整理する。下書きに使っている画像は自動削除しない。D1容量はダッシュボードでも監視する。
- 公開時に本文と必要な画像をまとめてGitへ反映する。以前GitHubへ一時アップロードした画像も読み込める。GitHubへの反映後にDB整理が失敗した場合はその旨を表示し、再試行しても同じ公開コミットを重複作成しない。
- 開発作業（develop など）を main に入れる前に、main を取り込む（`git merge origin/main`）。投稿画面の変更は main にしかない。
- パスキーはドメインに結び付く。独自ドメインに移ると、登録済みのパスキーは使えなくなり、全員の再登録（管理者が「端末を追加するリンク」を配る）が必要。
- Vercel のプレビューURLではパスキーが使えない（本番ドメイン専用）。
- 投稿画面から書けるのは `src/content/{articles,works,events}/*.md`、`public/images/{articles,works,events}/`、`src/content/{hours,printers}.json` だけ。

## ローカルで試す

`.env.local` に次を入れて `npm run dev -- --port 3100`。`http://localhost:3100/admin` を開く。

```
EDITOR_SQLITE_PATH=.editor-local/editor.db
EDITOR_ORIGIN=http://localhost:3100
```

- データベースは `.editor-local/editor.db`（SQLite）に作られる。
- 保存は GitHub ではなく作業ツリーのファイルに直接書かれ、履歴は `.editor-local/history.json` に残る。
- 招待: `npm run editor:invite -- --name "テスト"`

下書きのHTTP確認は `node --import tsx tests/editor-drafts-http.mjs`。専用の一時SQLiteと3117ポートの開発サーバーを作り、本番D1 / GitHub設定を無効にして、下書き表示・公開版との分離・一時画像の認証を確認する。実行後にテスト用サーバーとDBを片付ける。
