---
title: 'Adventurer 5M Pro を使った3Dプリント手順'
date: '2025-07-07'
excerpt: 'Adventurer 5M Pro を使った3Dプリントの手順を解説します。'
author:
  name: 'Yoshito Usui'
  avatar: '/images/usui.jpg'
coverImage: '/images/Adventure5Mpro.jpg'
---

## 1. 3D モデルを用意する

- 使用可能なファイル形式：`STL`, `OBJ` など
- モデルの入手方法：

  - オンラインでダウンロード（例：Thingiverse, Printables）
  - 自分で 3DCAD（例：TinkerCAD, Fusion360, Blender）で作成

- [Thingiverse](https://www.thingiverse.com) ダウンロード手順
  ![alt text](/images/adventure5mpro/thingiverse1.png)![alt text](/images/adventure5mpro/thingiverse2.png)

- [TinkerCad](https://www.tinkercad.com) ダウンロード手順
  ![alt text](/images/adventure5mpro/tinkercad1.png)![alt text](/images/adventure5mpro/tinkercad2.png)

## 2. Flash Studio Desktopを起動する

Adventurer 5M Proの現在の基準ソフトは、Flashforge公式の[Flash Studio Desktop](https://www.flashforge.com/pages/flash-studio-desktop)です。

- firmware 5.0.x以降では、旧Orca-FlashForgeのWi-Fi接続を前提にしません。
- KOBO設置PCとプリンターを同じLANへ接続し、スタッフがLAN Only接続を設定します。
- verification code、private IP、Printer IDは公開しません。一般利用者が入力する必要はありません。
- ソフトのversionやOSによって画面表示が異なるため、接続操作はKOBOスタッフと一緒に行ってください。

LAN OnlyではFlashforgeのcloud/mobile appから接続できません。KOBOでは、施設内LANでのスタッフ運用を基本とします。

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

スライス後はpreviewで、造形時間、support、モデルがplate外へ出ていないかを確認します。設定に迷う場合は送信前にKOBOスタッフへ相談してください。

既存のFlashPrint/Orca-FlashForge向け画像は画面構成が異なるため、現行の接続手順には使用しません。

## 4. スライスデータをプリンターに送信

- 方法 ①：USB メモリに保存 → 本体に挿入
- 方法 ②：Flash Studio DesktopからLAN経由で送信（KOBO設置PCでスタッフが操作）

[稼働状況画面](/printers)は閲覧専用です。Webからファイルを送信したり、印刷を申し込んだりすることはできません。

## 5. プリント前の準備

- フィラメント(3D プリントの材料)を背面から装着
  ![alt text](/images/adventure5mpro/print1.png)
- タッチパネルからフィラメントの押し出し命令を実行
  ![alt text](/images/adventure5mpro/print2.png)
- ノズルからフィラメントが出てくるか確認
  ![alt text](/images/adventure5mpro/print3.png)

- 必要であればオートレベリングを実行(基本的に必要なし)

## 6. プリント開始

- KOBOスタッフが送信内容と本体状態を確認し、Flash Studio Desktopまたはプリンターのタッチパネルから開始します。

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
