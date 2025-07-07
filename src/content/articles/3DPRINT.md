---
title: 'Adventurer 5M Pro を使った3Dプリント手順'
date: '2025-07-07'
excerpt: 'Adventurer 5M Pro を使った3Dプリントの手順を解説します。'
author:
  name: 'Yoshito Usui'
  avatar: '/images/usui.jpg'
coverImage: '/images/top5.jpg'
---

## 1. 3D モデルを用意する

- 使用可能なファイル形式：`STL`, `OBJ` など
- モデルの入手方法：

  - 自分で 3DCAD（例：TinkerCAD, Fusion360, Blender）で作成
  - オンラインでダウンロード（例：Thingiverse, Printables）

- thingiverse ダウンロード手順
  ![alt text](/images/adventure5mpro/thingiverse1.png)![alt text](/images/adventure5mpro/thingiverse2.png)

- TinkerCad ダウンロード手順
  ![alt text](/images/adventure5mpro/tinkercad1.png)![alt text](/images/adventure5mpro/tinkercad2.png)

## 2. スライスソフトを起動する

### Windows の方

- FlashPrint（Flashforge 製公式スライサー）を使用

  - [FlashPrint 公式ダウンロードページ](https://flashforge.jp/flashprint5/)

- FlashPrint をインストールし、Adventurer 5M Pro をプリンターとして選択
  ![alt text](/images/adventure5mpro/flashprint1.png)

### Mac・Linux の方

- Orca-FlashForge を使用
  - [Orca-FlashForge ダウンロードページ](https://after-support.flashforge.jp/orca-flashforge/)
- Orca-FlashForge をインストールし、Adventurer 5M Pro をプリンターとして選択
  ![alt text](/images/adventure5mpro/orca1.png)

## 3. モデルをスライスする

- スライサーに手順 1 で用意したモデル（STL ファイル等）を読み込む

  - 必要に応じて以下を設定(KOBO スタッフに要相談)：

    - 位置・向きの調整
    - サポート材の有無
    - ラフトの有無（特に理由がなければ推奨）
    - ノズル温度（例：PLA で 200℃ 前後）
    - ベッド温度（例：PLA で 50℃ 前後）

- スライスボタンを押して、G-code を生成
- 保存形式：`.gx`（Adventurer シリーズ独自形式）や `.3mf` もしくは `.gcode`

- FlashPrint の場合
  ![alt text](/images/adventure5mpro/flashprint2.png)
  ![alt text](/images/adventure5mpro/flashprint3.png)

- Orca-FlashForge の場合
  ![alt text](/images/adventure5mpro/orca2.png)
  ![alt text](/images/adventure5mpro/orca3.png)

## 4. スライスデータをプリンターに送信

- 方法 ①：USB メモリに保存 → 本体に挿入
- 方法 ②：Wi-Fi 経由で送信（KOBO 設置の PC ならできます．KOBO スタッフに相談）

## 5. プリント前の準備

- フィラメント(3D プリントの材料)を背面から装着
  ![alt text](/images/adventure5mpro/print1.png)
- タッチパネルからフィラメントの押し出し命令を実行
  ![alt text](/images/adventure5mpro/print2.png)
- ノズルからフィラメントが出てくるか確認
  ![alt text](/images/adventure5mpro/print3.png)

- 必要であればオートレベリングを実行(基本的に必要なし)

## 6. プリント開始

- プリンターのタッチパネルで「プリント」→ USB またはクラウドからファイル選択

  - 手順 1
    ![alt text](/images/adventure5mpro/print4.png)
  - 手順 2
    ![alt text](/images/adventure5mpro/print5.png)

- プリントが開始されるまで数十秒〜数分待つ

## 7. プリント完了後

- ノズルとベッドが冷えるまで待つ
- モデルを剥がす
  ![alt text](/images/adventure5mpro/print6.jpg)
- ゴミを除去
  ![alt text](/images/adventure5mpro/print7.png)

## 備考

わからないことは積極的にスタッフに聞こう！！
