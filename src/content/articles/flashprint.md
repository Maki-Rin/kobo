---
title: 'FlashPrintの基本的な使い方ガイド'
date: '2025-07-15'
excerpt: 'この記事では、スライサであるFlashPrintの基本的な使い方を紹介します。'
author:
  name: 'Yoshito Usui'
  avatar: '/images/usui.jpg'
coverImage: '/images/flashprint.png'
---

## 1. FlashPrintのインストール

* [FlashForgeの公式サイト](https://flashforge.jp/flashprint5/)から最新版をダウンロード・インストールしてください。

>2025年7月現在、macOS Sequoia 15.0以降はインストールに対応していないので、macOSは[Orca-Flashforge](https://after-support.flashforge.jp/orca-flashforge/)をご利用してください。


## 2. モデルの読み込み

### 1. FlashPrintを起動。
### 2. 造形する3Dプリンタを選択する

![alt text](/images/flashprint/flashprint1.png)

### 3. メニューまたは画面左上の「**ファイルボタン**」をクリックして、STLファイルなどの3Dモデルを読み込みます。

![alt text](/images/flashprint/flashprint2.png)

### 4. 読み込んだモデルは、マウスドラッグで視点移動、スクロールでズームできます。

![alt text](/images/flashprint/flashprint3.png)

## 3. モデルの配置と編集

### 移動（Move）: モデルをX/Y/Z方向に移動。
![alt text](/images/flashprint/flashprint4.png)

### 回転（Rotate）: 角度を指定してモデルの向きを変更。
![alt text](/images/flashprint/flashprint5.png)

### スケール（Scale）: サイズ変更。縦横比を保つ設定も可能。
![alt text](/images/flashprint/flashprint6.png)

### 複製（Duplicate）: 同じモデルをコピーして複数配置。
![alt text](/images/flashprint/flashprint7.png)


> ワンポイント：配置が不安定なときは「**プラットフォームに配置**」をクリックすると自動で最適な位置に置かれます。


## Tips: サポートの設定
3Dプリントでは、**空中に浮いている部分**があると、何も支えがないためうまく印刷できません。
そのようなときに使うのが「サポート（Support）」です。

![alt text](/images/flashprint/flashprint14.png)

![alt text](/images/flashprint/flashprint15.png)

### サポートを使う時の注意
* 取り外しがやや面倒になることがあります。
* サポート材が接している面の仕上がりが粗くなることもあります。

### まとめ

サポート材は、安定した印刷のための大切な機能です。

初心者のうちは、スライサの「おすすめ設定」や「プレビュー表示」を見ながら必要かどうか判断しましょう！

## 4. スライス設定

### 1. 画面上部の「スライスの実行」をクリック

![alt text](/images/flashprint/flashprint10.png)

### 2. エキスパートモードで設定した方が良い箇所

### ノズル・ベット温度

素材(フィラメント)に応じて変化します。以下にいくつかの例を示します。
* **PLA**
  * ノズル温度：190～220℃程度
  * ベッド温度：50～60℃程度

* **ABS**
  * ノズル温度：210～260℃程度
  * ベッド温度：90～110℃程度

* **PETG**
  * ノズル温度：220～250℃程度
  * ベッド温度：70～100℃程度


![alt text](/images/flashprint/flashprint9.png)


### レイヤーの高さ
* 造形物の精度に関わる。0.2mm程度が標準。

![alt text](/images/flashprint/flashprint13.png)

### 充填率(Infill)
* 内部の密度。15〜30%が一般的。

![alt text](/images/flashprint/flashprint8.png)

### ラフト
* 台座をつけて安定性を向上させたいときに使用する。Adoventure5MProの造形には基本的に使用した方が良い。
![alt text](/images/flashprint/flashprint11.png)

3. 設定後、「**スライス**」をクリック。
![alt text](/images/flashprint/flashprint12.png)

## 5. Gcodeの保存・出力

* スライス完了後、「**保存**」を選択し、SDカードやUSBにGcodeを出力します。
* FlashForgeプリンタによってはWi-Fi送信にも対応しています。


## 6. プリント開始

* 保存したGcodeを3Dプリンタに読み込み、「印刷開始」します。


## 補足Tips

* プリセット機能を使えば、よく使う設定を保存可能です。
* 日本語対応していない場合は、メニューから英語→日本語に変更可能です（環境設定から）
* どんなに上手く設定しても失敗する時は失敗します！そんな時はKOBOスタッフに相談しよう！
