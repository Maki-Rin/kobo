
# Adventurer 5M Pro を使った3Dプリント手順

## 1. 3Dモデルを用意する

* 使用可能なファイル形式：`STL`, `OBJ` など
* モデルの入手方法：

  * 自分で3DCAD（例：TinkerCAD, Fusion360, Blender）で作成
  * オンラインでダウンロード（例：Thingiverse, Printables）

* thingiverseダウンロード手順
![alt text](/images/adventure5mpro/thingiverse1.png)![alt text](/images/adventure5mpro/thingiverse2.png)

* TinkerCadダウンロード手順
![alt text](/images/adventure5mpro/tinkercad1.png)![alt text](/images/adventure5mpro/tinkercad2.png)


## 2. スライスソフトを起動する
### Windowsの方
* FlashPrint（Flashforge製公式スライサー）を使用

  * [FlashPrint公式ダウンロードページ](https://flashforge.jp/flashprint5/)
* FlashPrintをインストールし、Adventurer 5M Proをプリンターとして選択
![alt text](/images/adventure5mpro/flashprint1.png)

### Mac・Linuxの方
* Orca-FlashForgeを使用
  * [Orca-FlashForgeダウンロードページ](https://after-support.flashforge.jp/orca-flashforge/)
* Orca-FlashForgeをインストールし、Adventurer 5M Proをプリンターとして選択
![alt text](/images/adventure5mpro/orca1.png)

## 3. モデルをスライスする

* スライサーに手順1で用意したモデル（STLファイル等）を読み込む
  * 必要に応じて以下を設定(KOBOスタッフに要相談)：

    * 位置・向きの調整
    * サポート材の有無
    * ラフトの有無（特に理由がなければ推奨）
    * ノズル温度（例：PLAで200℃前後）
    * ベッド温度（例：PLAで50℃前後）
  
* スライスボタンを押して、G-codeを生成
* 保存形式：`.gx`（Adventurerシリーズ独自形式）や `.3mf` もしくは `.gcode` 

* FlashPrintの場合
![alt text](/images/adventure5mpro/flashprint2.png)
![alt text](/images/adventure5mpro/flashprint3.png)

* Orca-FlashForgeの場合
![alt text](/images/adventure5mpro/orca2.png)
![alt text](/images/adventure5mpro/orca3.png)

## 4. スライスデータをプリンターに送信

* 方法①：USBメモリに保存 → 本体に挿入
* 方法②：Wi-Fi経由で送信（KOBO設置のPCならできます．KOBOスタッフに相談）

## 5. プリント前の準備

* フィラメント(3Dプリントの材料)を背面から装着
  * ![alt text](/images/adventure5mpro/print1.png)
* タッチパネルからフィラメントの押し出し命令を実行
  * ![alt text](/images/adventure5mpro/print2.png)
* ノズルからフィラメントが出てくるか確認
  * ![alt text](/images/adventure5mpro/print3.png)

* 必要であればオートレベリングを実行(基本的に必要なし)

## 6. プリント開始

* プリンターのタッチパネルで「プリント」→ USBまたはクラウドからファイル選択
  * 手順1 
  * ![alt text](/images/adventure5mpro/print4.png)
  * 手順2
  * ![alt text](/images/adventure5mpro/print5.png)

* プリントが開始されるまで数十秒〜数分待つ

## 7. プリント完了後

* ノズルとベッドが冷えるまで待つ
* モデルを剥がす
  * ![alt text](/images/adventure5mpro/print6.jpg)
* ゴミを除去
  * ![alt text](/images/adventure5mpro/print7.png)

## 備考
わからないことは積極的にスタッフに聞こう！！