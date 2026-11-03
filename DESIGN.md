---
version: alpha
name: KOBO unofficial
description: 立命館大学OIC KOBO（工房）の非公式サイト。稼働状況・使い方・作品・イベントを、スタッフの口調で見せる。
colors:
  primary: "#FFC715"
  primary-soft: "#FFF4CC"
  ink: "#2B2838"
  line: "#413B54"
  paper: "#FFFFFF"
  kraft: "#F3E9D8"
  muted: "#6B6878"
  line-soft: "#E3E0E8"
  free: "#D6F2DF"
  busy: "#DBE8FB"
  wait: "#FFE3EC"
  alert: "#FFD9CC"
  off: "#EEEDF0"
typography:
  display:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  number:
    fontFamily: Geist, sans-serif
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1
  heading:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.4
  title:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.8
  reading:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  md: 10px
  lg: 12px
  full: 9999px
spacing:
  gutter: 16px
  gutter-wide: 28px
  section: 32px
  stack: 14px
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 6px 12px
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 6px 12px
  badge-unofficial:
    backgroundColor: "{colors.line}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  card-hover:
    backgroundColor: "{colors.primary-soft}"
  status-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  section-band:
    backgroundColor: "{colors.kraft}"
  chip-free:
    backgroundColor: "{colors.free}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 1px 9px
  chip-busy:
    backgroundColor: "{colors.busy}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 1px 9px
  chip-wait:
    backgroundColor: "{colors.wait}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 1px 9px
  chip-alert:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 1px 9px
  chip-off:
    backgroundColor: "{colors.off}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: 1px 9px
  caption:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  divider:
    backgroundColor: "{colors.line-soft}"
    height: 1px
---

# KOBO unofficial のデザイン

公開サイト（`src/app` のうち `/admin` 以外）の決まり。投稿画面（`/admin`）は別の決まり（`src/app/admin/_components/ui.ts`）で、ここには含めない。

> 状態: **C3案で確定、サイトへの反映はまだ**（2026-10-27）。今のサイトは旧B2（2px線・ずらした影・56px見出し）のまま。見本は `design-mock/directions-c.html` の C3。

## 決めた経緯

- B2（2pxの黒線・`4px 4px 0` の影・大きな太字）は「AIっぽい」「黒が強い」「文字が大きい」「unofficial が見えない」と判断して、やめた。
- 比べた3案（C1 掲示板 / C2 写真が主役 / C3 B案を落ち着かせる）から C3 を採用。構成とポップさは残し、線・影・文字サイズを抑えた案。
- 参考にした公開 DESIGN.md: creema（11〜12pxの小さな文字、影なし）、connpass（本文12px、1px線、角丸4px）、awesome-design-md-jp の日本語テンプレート（本文の行間1.7〜2.0、`palt` は見出しとナビだけ）。日本語サイトは欧米のテンプレートより文字が小さく、情報が詰まっているのが普通。

## Overview

白地に細い線、KOBOスタッフのチラシと同じ黄色と紺で「楽しげ」を出す。

- ポップさは**黄色の面と丸い形（pill）**で出す。線の太さ、影、大きな文字では出さない。
  - 理由: 太い線と影を全部に付けると、どこが大事か分からなくなり、よくある生成デザインに見えた。
- いちばん目立たせるのは**意味のある情報**（いま空いている台数、開室時間、次のイベントの日時）。
- 余白は詰め気味。セクションの間 32px、カードの間 14px。
  - 理由: C3案は余白が多く、見せるほど大事なことが書いていないと感じた。

## Colors

色は**KOBOに実際にあるもの**から取る。サイトだけの色を作らない。

| トークン | 値 | どこから取ったか / なぜ |
|---|---|---|
| `primary` | #FFC715 | 0624「3D PRINTER WORKSHOP」チラシの背景の黄色。スタッフがすでに使っている色なので、サイトとチラシが同じものに見える。旧 #FFD400 より少し暖かい。 |
| `line` | #413B54 | 同じチラシの見出しと下の帯の紺。純粋な黒（#111）の代わりに枠線・unofficial バッジに使う。黒より柔らかく、黄色と合う。 |
| `ink` | #2B2838 | 文字の色。`line` を少し暗くして、本文として読みやすいコントラスト（白地で約14:1）を確保。 |
| `kraft` | #F3E9D8 | 0513チラシの段ボール製「KOBO」ロゴの明るい部分。セクションを分ける帯の背景にだけ使う。工房の合板の作業台にも近い。 |
| `primary-soft` | #FFF4CC | 黄色を薄めたもの。カードのホバーと、黄色い面を広く使いたいとき（帯など）。 |
| `muted` / `line-soft` | #6B6878 / #E3E0E8 | 補足の文字と区切り線。`line` の紺に寄せたグレー。 |

- 状態の色（`free` 緑・`busy` 青・`wait` ピンク・`alert` 赤みのオレンジ・`off` グレー）は信号機や他のサービスと同じ意味にした。初めて見た人でも、説明なしで分かるようにするため。
  - 状態の色は稼働状況とイベントの状態にだけ使う。上の文字は `ink`（`off` だけ `muted`）。色だけでなく「空き」などの文字を必ず添える。
- `primary` は1画面に3か所まで（今いるメニュー、主ボタン、ロゴのバッジ）。広い面に使うときは `primary-soft`。

## Typography

| 役割 | サイズ | 使う場所 |
|---|---|---|
| `display` | 30px / 700 | トップの「Let's Fab!!」だけ |
| `number` | 26px / 700 | 空き台数などの数字 |
| `heading` | 18px / 700 | セクション見出し、ページ見出し |
| `title` | 14px / 600 | カードのタイトル |
| `body` | 14px / 400、行間1.8 | 一覧・カード・説明などの地の文 |
| `reading` | 16px / 400、行間1.9 | 記事の本文だけ |
| `label` | 12px / 500 | 日付、種類、チップ、ボタン |

- 理由: 旧B2は見出し56px・28px・本文16pxで、日本語サイトとしては大きすぎた。日本の一般的なサイトに合わせて本文14px、見出し18px前後にした。記事の本文だけは長く読むので16px。
- 太さは 700 まで（`font-extrabold` / `font-black` は使わない）。
- 欧文は Geist、日本語は OS のゴシック（ヒラギノ角ゴ・Noto Sans JP）。明朝は使わない。
- `palt`（約物を詰める）は見出し・ナビ・ボタンだけ。本文に掛けると読みにくいので掛けない。

## Layout

- 中身の幅は最大 1152px、左右の余白はスマホ 16px・PC 28px。
- トップは「写真（左下に白いカードで見出し）→ 稼働状況のカード（写真に少し重ねる）→ まなぶ → 作品 → イベント」。
- 稼働状況のカードは「開室時間・空き ◯台 / 8台・各台のチップ・全部見る」を1段に。ページを開いてすぐ目に入るようにするため、写真に重ねる。
- 一覧はカードのグリッド（記事3列、作品4列、イベント3列。スマホは1〜2列）。
- 「すべて見る」はセクション見出しの右。

## Elevation & Depth

- **影は使わない。** 面の区別は1pxの線と背景色で付ける。
  - 理由: `4px 4px 0` の影が「黒が強い」「AIっぽい」と感じた主な原因だった。
- ホバーはカードの背景を `primary-soft` にするだけ。動かさない。

## Shapes

- 線はすべて 1px。押せるもの（ボタン、カード、メニュー、ヘッダーの下）は `line`、区切りは `line-soft`。
- 角丸: カード 10px、稼働状況のカード 12px、ボタン・チップ・メニューは pill。
- 画像はカードの中では下辺だけ線を引く。

## Components

- **ヘッダー**: 左にロゴ「KOBO」＋ `badge-unofficial`（紺地に黄色、11px）。右に pill 型のメニュー、今いるページは黄色。
  - 理由: 旧バッジは10pxの黒地で小さすぎて読めなかった。文字を大きくし、黒ではなく紺にして黄色と同じチラシの組み合わせにした。
- **主ボタン**: 黄色・1px線・影なし。1つのまとまりに1つ。
- **副ボタン**: 白・1px線。
- **カード**: 白・1px線・角丸10px。上に画像、下に「種類・日付（`label`）→ タイトル（`title`）」。説明文は付けないか2行まで。
- **チップ**: 状態や機材を表す小さな pill。状態は色付き、機材は白。
- **セクションの帯**: `kraft` の背景。トップで1か所（イベントなど）だけ使い、白の繰り返しに区切りを付ける。

## 文言

- スタッフが学生に話しかける口調。「〜してね」「〜です」を混ぜてよい。
- 書かないもの:
  - 見出しの下の、内容のない一言（「KOBOでつくられたもの。」など）
  - 「創造力を形に」「革新的な」「〜を始めましょう」のような広告文
  - 体言止めの短文を続けて並べること
- 書くもの: 利用者が次にとる行動、事実（日時・場所・台数）、注意（「ファイル名は公開されます」）。
- 確かでない事実（場所、利用条件など）は書かない。

## Do's and Don'ts

- Do: 色は KOBO のチラシ・ロゴ・工房から取る。新しい色を足すときは出どころを上の表に書く。
- Do: 状態は色と文字の両方で示す。
- Do: 大きな文字は数字と日時に使う。
- Don't: 影を付ける（ぼかしあり・なしとも）。
- Don't: 2px以上の線、純粋な黒（#000・#111）。
- Don't: 太さ800以上、20pxを超える日本語の見出し（`display` を除く）。
- Don't: 黄色を背景一面に使う（広い面は `primary-soft` か `kraft`）。
