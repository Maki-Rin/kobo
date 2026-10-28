# 公開前のセキュリティ対応メモ

確認日: 2026-10-28。対象: `feature/editor`（基点 `c0cb47a`）を含むWebサイト。
Vercel / Cloudflare / GitHub の実アカウント設定は、本メモだけでは検証済みとならない。

## 実装した対策

- 外部URL取得: 完全一致の許可ホスト・HTTPS・標準ポートのみ。URL内の認証情報を拒否。DNSの公開IPv4を検証し、確認したIPへ接続を固定する。プライベートIP・loopback・link-local・予約アドレス・IPv6への接続は禁止。
- リダイレクト: 最大2回、接続先を毎回再検証。取得全体5秒、HTML512KB / 画像3MBまでを受信中に制限。圧縮レスポンスと不適切なContent-Typeを拒否。
- 画像プロキシ: JPEG / PNG / WebP / GIFのシグネチャを検証し、SVG / HTMLは配信しない。メタデータは1時間キャッシュする。
- パスキー: 登録・認証ともユーザー確認（PIN / 生体認証）必須。Origin / RP ID / challengeも検証。
- challenge: 5分有効、発行ブラウザのHttpOnly Cookieに紐付け、SQLのDELETE RETURNINGで一度だけ使用。
- 招待 / 回復リンク: 使用済み・失効条件を含むUPDATE RETURNINGで一度だけ使用。同時アクセスでも1件のみ成功。
- Server Actions: 設定された `EDITOR_ORIGIN` とOriginヘッダーを毎回照合。本番はOrigin / RP IDを明示設定し、指定ホストだけで投稿画面を提供。Previewの投稿操作と本番GitHubストア利用を拒否。
- セッション: 本番で `__Host-` / Secure / HttpOnly / SameSite=Strict。通常7日、共有端末2時間。パスキー削除・役割変更・無効化でセッションを失効させ、役割変更・無効化では未使用の本人向けリンクも失効。
- 権限: まとめ役から開発者への回復リンク発行・端末追加・パスキー削除・無効化・役割変更を拒否。人物とメンバーの関連付けもサーバーで権限確認。
- レート制限: D1の原子的カウンターを全インスタンスで共有。IPはVercelが付ける `x-vercel-forwarded-for` のみを信頼しHMAC化。ローカル等は転送ヘッダーを信用せず共通枠を使用。各枠の10倍の全体枠も設ける。
- 認証開始15回/分、検証20回/分、登録開始10回/分、回復リンク利用10回/分。アップロード60回/時、招待10回/時、保存30回/時。プレビュー・管理操作にも上限。成功リクエストの約1%で期限切れデータを削除。
- 投稿: 本文 / プレビューのHTMLサニタイズ、記事ID・パス・本文サイズ・画像形式 / サイズ / 件数の検証。
- ヘッダー: nosniff、frame拒否、Referrer / Permissions Policy。投稿画面はnonce付きCSP、no-store、no-referrer、noindex。nonceは投稿画面だけで使用し公開ページの静的生成を維持。
- GitHub / D1: タイムアウト・リダイレクト拒否。GitHub短期トークンは指定リポジトリとContents権限へ限定。書込パスallowlistを維持。
- プリンター: 受信中の本文サイズ制限・リダイレクト拒否。WebサイトのAPI / SSRではファイル名を既定で除去し、状態・進捗・時間・前回結果を維持。

## Vercelへ公開する前の作業

1. `docs/editor-setup.md` のD1 / GitHub App設定を行う。D1が既設なら未適用分だけを番号順に適用する。新規は0001〜0004。

   ```sh
   npx wrangler d1 execute kobo-editor --remote --file=db/editor/migrations/0004_security.sql
   ```

2. `EDITOR_RATE_LIMIT_SECRET` に暗号学的にランダムな32文字以上の値を追加する。生成例:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

   `EDITOR_D1_API_TOKEN` / `EDITOR_GITHUB_PRIVATE_KEY` とともにVercelのSecretとしてProductionだけに登録する。GitやPreviewへ本番の資格情報を渡さない。
3. `EDITOR_ORIGIN=https://kobo-rits.vercel.app`（末尾スラッシュなし）、プリンターAPI、GitHub / D1の設定をProductionに登録。Node.js 22.xを使用。`EDITOR_SQLITE_PATH` はローカル専用で本番へ登録しない。
4. Preview保護、Git fork protection、ログ / ソース保護を有効のままにする。公開補助APIにはWAF / レート制限・利用額アラートも設定する。アプリの上限は大量トラフィック自体を止めない。
5. 本番ドメインで招待→パスキー登録→ログイン→下書き→公開→ログアウトを実機確認。Cookie名が変わるので既存ユーザーも再ログインが必要。
6. 公開用ブランチへ統合し、環境変数登録後に再デプロイ。別途作業中のデザイン差分・ダミーイベント等の確認用コンテンツの扱いも確認する。

## kobo-server側に必要な対応（このWebリポジトリからは未変更）

### 2026-10-28: 適用先の確認結果

- Windowsの `Documents/kobo-server` はGit管理情報のない旧コピーで、公開契約は `schemaVersion: 1.0`。稼働中APIの `1.2` と一致しないため、このコピーからの再デプロイは行わない。
- 移行記録上の現在の作業場所は、実機の `~/projects/kobo-server`。実機へのネットワーク到達と既存のホスト鍵の一致は確認できたが、SSH認証で拒否された。
- この端末の既定RSA公開鍵はサーバーから受理されず、SSH agentも未起動。秘密鍵の内容やサーバー上のcredentialは読み取っていない。
- 次に必要なのは、普段使うSSHのユーザー / ホスト別名 / 鍵ファイルパス、または最新ソースのGitリポジトリURL。パスワードや秘密鍵本文をチャットへ送る必要はない。
- 接続後は既存の未コミット変更を保護して最新ソースに修正し、契約・回帰テストを通す。稼働中edge agentの再起動や実機印刷操作は、公開APIの修正に必要がなければ行わない。

現地agent→認証付きテレメトリ→Cloudflareの保存済み表示データ→VercelのGETという経路。現在、Webから実機へ操作コマンドを送る実装はない。

- **元APIからもファイル名を除外する。** `apps/control-plane/src/store.ts` の公開DTO生成箇所等で `currentWork.fileName` / `lastWork.fileName` をnullまたは匿名名にし、public schema / fixture / contract testを揃える。Web側だけで隠してもWorkerのURLを直接開くと取得できる。
- ファイル名には氏名・研究名・未公開作品名が入り得る。現在はすでに認証なしで公開されているので、過去の公開キャッシュやログも確認する。Web側の `KOBO_PRINTER_PUBLIC_FILE_NAMES=true` は公開方針を明示的に決めた場合だけ使用する。
- public GETとedge telemetryにCloudflareのレート制限を追加。公開GETのキャッシュ、edgeのcredential別 + 全体枠を利用し、認証失敗の大量アクセスは可能ならWAFで処理する。
- テレメトリの64KB上限を `arrayBuffer()` 後だけでなく受信ストリーム中にも適用。Content-Lengthを信用しない。サイズを偽った本文もテストする。
- `EDGE_API_TOKEN` はWorker Secret、プリンターのチェックコード等は現地credential storeに限定。Vercelへ渡さず、失効・ローテーション手順を確認する。
- 将来operator/admin/印刷操作を追加するときは認証・権限・監査を別途設ける。Cloudflare Accessの入口だけに依存せず、JWTと権限をアプリ側でも検証。public / edge / operatorで権限を共用しない。
- 稼働中WorkerのWAF / Secret / 現地ネットワーク設定は今回未検証。

## 運用上の注意と残るリスク

- GitHub Appはこのリポジトリだけにインストール。現在のmain直接コミット運用は維持。App秘密鍵が漏れるとコード内のパス制限を迂回できるので、ブランチルールのバイパスは最小限にし、漏えい時はApp鍵とD1トークンを失効させる。さらに分離するならcontent専用ブランチ→検証→main反映へ変更する。
- 回復リンクは15分有効の資格情報。本人に個別送信し共有チャンネルへ貼らない。no-referrerでもブラウザ履歴・プラットフォームのアクセスログからは消えない。
- 下書きは「サイトへ掲載しない」状態で、秘密保管ではない。公開Gitリポジトリ内の本文・コミット済み画像は別経路で閲覧され得る。機密原稿・個人情報を入れない。
- D1のREST APIトークンは利用可能な範囲でアカウント / DBを絞る。権限が広くなる運用を受容できない場合は、DB bindingを持つ専用Workerへ認証用の最小APIを移す。

## 検証と参照

2026-10-28の検証結果: 回帰テスト9件、Lint、型チェック、本番ビルドを通過。本番依存関係の `npm audit --omit=dev` は0件。
開発サーバーと本番ビルドの両方に、ローカル専用DBでHTTP試験を行い、未認証の保存 / 画像取得拒否、Origin違反拒否、認証開始の上限、CSP nonce、キャッシュ禁止を確認した。ライブのプリンターAPIから8台分を取得し、Web応答からファイル名が除去されていることも確認した。

`npm run test:security` はSSRF入力・プライベートIP・受信上限・権限・同時リンク消費・SQLレート制限・Markdown XSS・ファイル名除去・パストラバーサルを確認する。
`node --import tsx tests/security-http.mts` は使い捨てのローカルDBで起動した3111ポートの開発サーバーを対象とする。ログイン枠を使い切る試験なので実運用のDBへ実行しない。`SECURITY_BASE_URL` / `SECURITY_ORIGIN` / `SECURITY_MANIFEST` でローカルの本番ビルドにも実行できる。
公開前にLint、型チェック、本番ビルド、`npm audit --omit=dev` も行う。脆弱性監査はその時点のロックファイルに対する結果であり将来の安全を保証しない。
本番D1 / GitHubへの書込と実機操作は、今回の試験に含めない。

- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy)
- [SimpleWebAuthn server](https://simplewebauthn.dev/docs/packages/server)
- [Vercel Request Headers](https://vercel.com/docs/headers/request-headers)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
