---
version: alpha
name: KOBO unofficial
description: 立命館大学OIC KOBO（工房）の非公式サイト。稼働状況・使い方・作品・イベントを、スタッフの口調で楽しげに見せる。
colors:
  ink: "#111111"
  paper: "#FFFFFF"
  cream: "#FFFBEA"
  accent: "#FFD400"
  muted: "#555555"
  line-soft: "#D9D9D2"
  free: "#C9F5D6"
  busy: "#CFE6FF"
  wait: "#FFE0EE"
  alert: "#FFD6CC"
  off: "#ECECE8"
typography:
  display:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 56px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.02em
  number:
    fontFamily: Geist, sans-serif
    fontSize: 44px
    fontWeight: 800
    lineHeight: 1
  heading:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.3
  title:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.55
  body:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: Geist, Hiragino Sans, Noto Sans JP, sans-serif
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  gutter: 16px
  gutter-wide: 32px
  section: 48px
  stack: 16px
components:
  button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 10px 16px
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 10px 16px
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  chip-free:
    backgroundColor: "{colors.free}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  chip-busy:
    backgroundColor: "{colors.busy}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  chip-wait:
    backgroundColor: "{colors.wait}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  status-band:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
---

# KOBO unofficial のデザイン

公開サイト（`src/app` のうち `/admin` 以外）の決まり。投稿画面（`/admin`）は別の決まり（`src/app/admin/_components/ui.ts`）で、ここには含めない。

## Overview

白地と黒い線を基本に、黄色・状態の色・小さな影で「楽しげ」を出す（B案「ポップ」のうち、今の構成を残した B2 を土台にし、稼働状況のカードだけ B3 から借りた）。

- ポップさは**線・影・色**で出す。文字を太く大きくして出さない。
- いちばん目立たせるのは**意味のある情報**（いま空いている台数、次のイベントの日時）。キャッチコピーや飾りの言葉を大きくしない。
- 余白は詰め気味。セクションの間は 48px、カードの間は 16〜20px。

## Colors

- `ink`（#111）: 文字・枠線・影。黒一色で、グレーの枠線は使わない（区切り線だけ `line-soft`）。
- `paper`（白）: 基本の背景。`cream` は稼働状況の帯などのひと区切りにだけ使う。
- `accent`（黄 #FFD400）: 主ボタン、マーカー、いま選んでいるメニュー、ステッカー。1画面に多くても3か所。
- 状態の色は稼働状況とイベントの状態にだけ使う。`free` 空き・完成、`busy` 造形中・準備中、`wait` 一時停止・開催予定、`alert` エラー、`off` オフライン・電源オフ・開催済み。
- 状態の色の上の文字は必ず `ink`。色だけで状態を伝えず、文字（「空き」など）を必ず添える。

## Typography

- 欧文は Geist、日本語は OS のゴシック（ヒラギノ角ゴ・Noto Sans JP）。明朝は使わない。
- 本文は 16px・行間 1.8・通常の太さ。太字は見出しと数字と短いラベルだけ。
- `display`（56px）はトップの「Let's Fab!!」だけ。`number`（44px）は台数など数字だけ。
- 見出しを強調するときは黄色のマーカー（`.marker`、下 38% に黄色）。白抜き文字・縁取り文字は使わない（Geist で線が重なって汚く見えた）。
- 日本語の約物は詰める（`font-feature-settings: "palt"`）。

## Layout

- 中身の幅は最大 1152px（`max-w-6xl`）、左右の余白はスマホ 16px・PC 32px。
- トップは「全幅の写真（左下に白いカードで見出し）→ 稼働状況のカード → 次のイベント → まなぶ → 作品 → イベント」。
- 稼働状況のカードは写真に少し重ねて置き、ページを開いてすぐ目に入るようにする。
- 一覧はカードのグリッド（記事3列、作品4列、イベント3列。スマホは1〜2列）。
- 「すべて見る」などのリンクは、セクション見出しの右に置く。下に置かない。

## Elevation & Depth

- 影は `4px 4px 0 ink` の1種類だけ（ぼかしなし）。押せるもの（ボタン、カード、メニュー）にだけ付ける。
- ホバーで左上に 2〜3px 動き、影が少し大きくなる。押せないものは動かさない。

## Shapes

- 枠線は 2px（チップだけ 1.5px）。
- 角丸: カード 12px、大きいカード・写真 16px、ボタン・チップ・メニューは完全な丸（pill）。
- 画像には枠線を付け、カードの中では下辺だけ線を引く。

## Components

- **ヘッダー**: 左にロゴ（KOBO＋黒地に黄色の「unofficial」）、右に pill 型のメニュー。今いるページは黄色。
- **主ボタン**: 黄色・黒枠・影。1つのまとまりに1つ。
- **副ボタン**: 白・黒枠・影。
- **カード**: 白・黒枠・角丸12px。上に画像、下に「種類のラベル → タイトル → 補足（日付・人・機材）」の順。説明文は2行まで。
- **チップ**: 状態や機材を表す小さな pill。状態は色付き、機材は白。
- **稼働状況のカード**: 「空き ◯台 / 全◯台」を大きな数字で、その横に各プリンタのチップ、右に「全部見る」。開室時間はカードの上の段に小さく。
- **セクション見出し**: 28px・太字。下に説明文は付けない（付けるなら、読んだ人が次に何をすればいいか分かる文だけ）。

## 文言

- スタッフが学生に話しかける口調。「〜してね」「〜です」を混ぜてよい。
- 書かないもの:
  - 見出しの下の、内容のない一言（「KOBOでつくられたもの。」「機材の使い方と、使ってみて分かったこと。」など）
  - 「創造力を形に」「革新的な」「〜を始めましょう」のような広告文
  - 体言止めの短文を続けて並べること
- 書くもの: 利用者が次にとる行動（「印刷したいときはスタッフに声をかけてください」）、事実（日時・場所・台数）、注意（「ファイル名は公開されます」）。
- 書いてあることが確かでない事実（場所、利用条件など）は書かない。分からなければスタッフに確認する。

## Do's and Don'ts

- Do: 状態は色と文字の両方で示す。
- Do: 大きな文字は数字と日時に使う。
- Do: 押せるものだけに影を付ける。
- Don't: 太さ 900 や 40px 以上の日本語の見出しを並べる。
- Don't: 黄色を背景一面に使う（帯の背景は `cream`）。
- Don't: グレーのぼかし影（`shadow-md` など）を混ぜる。
- Don't: 角の丸みや枠線の太さを場所ごとに変える。
