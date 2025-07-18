---
title: 'Orca-Flashforgeの基本的な使い方ガイド'
date: '2025-07-17'
excerpt: 'この記事では、スライサであるOrca-FlashForgeの基本的な使い方を紹介します。'
author:
  name: 'Yoshito Usui'
  avatar: '/images/usui.jpg'
coverImage: '/images/orca-flashforge.png'
---

## 1. FlashPrintのインストール

* [Orca-FlashForgeの公式サイト](https://after-support.flashforge.jp/orca-flashforge/)から最新版をダウンロード・インストールしてください。

## 2. モデルの読み込み

### 1. Orca-FlashForgeを起動。
### 2. 造形する3Dプリンタ・ベッドタイプ・フィラメントを選択する

![alt text](/images/orca-flashforge/orca-flashforge1.png)

### 3. メニューまたは画面左上の「ファイルボタン」をクリックして、STLファイルなどの3Dモデルを読み込みます。

![alt text](/images/orca-flashforge/orca-flashforge2.png)

### 4. 読み込んだモデルは、マウスドラッグで視点移動、スクロールでズームできます。

![alt text](/images/orca-flashforge/orca-flashforge3.png)


## 3. モデルの配置と編集

### 移動（Move）: モデルをX/Y/Z方向に移動。
![alt text](/images/orca-flashforge/orca-flashforge4.png)

### 回転（Rotate）: 角度を指定してモデルの向きを変更。
![alt text](/images/orca-flashforge/orca-flashforge5.png)

### スケール（Scale）: サイズ変更。縦横比を保つ設定も可能。
![alt text](/images/orca-flashforge/orca-flashforge6.png)

### 複製（Duplicate）: 同じモデルをコピーして複数配置。
![alt text](/images/orca-flashforge/orca-flashforge7.png)

## 4. スライス設定

### 1. 画面左側のパラメータを参照

![alt text](/images/orca-flashforge/orca-flashforge8.png)


### レイヤーの高さ
* 造形物の精度に関わる。0.2mm程度が標準。

![alt text](/images/orca-flashforge/orca-flashforge9.png)

### 充填率(Infill)
* 内部の密度。15〜30%が一般的。

![alt text](/images/orca-flashforge/orca-flashforge10.png)

### ラフト
* 台座をつけて安定性を向上させたいときに使用する。Adoventure5MProの造形には基本的に使用した方が良い。
![alt text](/images/orca-flashforge/orca-flashforge11.png)

3. 設定後、「**スライス**」をクリック。
![alt text](/images/orca-flashforge/orca-flashforge12.png)


### Tips: サポートの設定
3Dプリントでは、**空中に浮いている部分**があると、何も支えがないためうまく印刷できません。
そのようなときに使うのが「サポート（Support）」です。

![alt text](/images/orca-flashforge/orca-flashforge13.png)

![alt text](/images/orca-flashforge/orca-flashforge14.png)

**サポートを使う時の注意**

* 取り外しがやや面倒になることがあります。
* サポート材が接している面の仕上がりが粗くなることもあります。

## 5. Gcodeの保存・出力

* スライス完了後、「**保存**」を選択し、SDカードやUSBにGcodeを出力します。


## 6. プリント開始

* 保存したGcodeを3Dプリンタに読み込み、「印刷開始」します。


## 補足Tips

* プリセット機能を使えば、よく使う設定を保存可能です。
* どんなに上手く設定しても失敗する時は失敗します！そんな時はKOBOスタッフに相談しよう！
