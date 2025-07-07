# KOBO の Web サイト作るぞ！

### 開発者

[臼井義人](https://www.usuiyoshito.com)，牧野倫太郎

## 記事（Articles）の書き方

このプロジェクトでは、記事は **Markdown ファイル 1 つだけ** で完結します。
記事のメタデータとコンテンツは全て `src/content/articles/[ファイル名].md` に記述します。

### 1. 記事ファイルの作成

`src/content/articles/` フォルダに新しい Markdown ファイルを作成します

### 2. 記事の構造

```markdown
---
title: '記事のタイトル'
date: '2025-07-07'
excerpt: '記事の概要・説明'
author:
  name: '著者名'
  avatar: '/images/著者のアバター画像.jpg'
coverImage: '/images/カバー画像.jpg'
---

## セクション 1 のタイトル

ここに内容を書きます。

### サブセクション 1.1

サブセクションの内容。

## セクション 2 のタイトル

画像を挿入する場合：
![画像の説明](/images/画像ファイル名.jpg)

## セクション 3 のタイトル

リストを作成する場合：

- アイテム 1
- アイテム 2
- アイテム 3
```

### 3. Front Matter（YAML ヘッダー）の説明

記事の先頭にある `---` で囲まれた部分は Front Matter と呼ばれ、記事のメタデータを定義します：

- `title`: 記事のタイトル
- `date`: 投稿日（YYYY-MM-DD 形式）
- `excerpt`: 記事の概要
- `author.name`: 著者名
- `author.avatar`: 著者のアバター画像パス
- `coverImage`: カバー画像パス

### 4. 画像の配置

画像は `public/images/` フォルダに配置してください：

```
public/
  images/
    著者のアバター画像.jpg
    記事のディレクトリ/
        カバー画像.jpg
        記事内で使用する画像.jpg
```

### 5. URL 構造

記事の URL は **ファイル名** がそのまま使用されます：

- `3DPRINT.md` → `http://localhost:3000/articles/3DPRINT`

### 6. 目次の自動生成

Markdown ファイル内の `## `（h2）と `### `（h3）見出しから自動的に目次が生成されます。

### 7. 記事の公開

新しい記事を公開するには：

1. `src/content/articles/` に新しい `.md` ファイルを作成
2. Front Matter を正しく記述
3. 本文を Markdown で記述
4. 画像がある場合は `public/images/` に配置

**これだけで自動的に記事一覧に表示されます！**

### 8. 記事の並び順

記事は **投稿日（date）の新しい順** で自動的に並びます。

### 注意点

- ファイル名は URL に使用されるため、英数字とハイフンのみ使用してください
- 画像パスは `public/` フォルダからの相対パスで指定してください
- 日付は `YYYY-MM-DD` 形式で記載してください
- Front Matter の YAML 形式を正しく記述してください（インデント等に注意）

## 作品（Works）の書き方

作品情報は `public/data/works.json` ファイルで管理します。

### 1. 作品ファイルの編集

`public/data/works.json` を開いて、以下の形式で新しい作品を追加します：

```json
[
  {
    "id": "1",
    "title": "Master Sword",
    "description": "3Dプリント作品です。\n複雑な構造も精密に再現できます。\n\n詳細な手順については https://www.usuiyoshito.com をご覧ください。",
    "coverImage": "/images/works/mastersword.jpg",
    "images": ["/images/works/mastersword.jpg"],
    "tags": ["3D Printer"],
    "author": {
      "name": "Yoshito Usui ",
      "avatar": "/images/usui.jpg"
    }
  }
]
```

### 2. 作品データの構造

- `id`: 作品の一意識別子（文字列）
- `title`: 作品のタイトル
- `description`: 作品の説明（改行は `\n` で表現）
- `coverImage`: カバー画像のパス
- `images`: 作品画像の配列（複数の画像を表示可能）
- `tags`: 作品のタグ配列（例：["3D Printer", "レーザー"]）
- `author.name`: 作成者名
- `author.avatar`: 作成者のアバター画像パス

### 3. 作品画像の配置

作品画像は `public/images/works/` フォルダに配置してください：

```
public/
  images/
    works/
      mastersword.jpg
      manga.jpeg
```

### 4. 作品の公開

新しい作品を公開するには：

1. `public/data/works.json` に作品データを追加
2. 作品画像を `public/images/works/` に配置
3. 作成者のアバター画像を `public/images/` に配置（未配置の場合）

### 5. 作品の並び順

作品は JSON ファイル内の配列順で表示されます。

### 注意点

- `id` は他の作品と重複しないようにしてください
- 画像パスは `public/` フォルダからの相対パスで指定してください
- JSON の形式を正しく記述してください（カンマ、引用符等に注意）
- 説明文の改行は `\n` で表現してください

## イベント（Events）の書き方

イベント情報は `public/data/events.json` ファイルで管理します。

### 1. イベントファイルの編集

`public/data/events.json` を開いて、以下の形式で新しいイベントを追加します：

```json
[
  {
    "date": "2025-05-13",
    "image": "/images/events/0513.png"
  },
  {
    "date": "2025-06-24",
    "image": "/images/events/0624.png"
  }
]
```

### 2. イベントデータの構造

- `date`: イベント日付（YYYY-MM-DD 形式）
- `image`: イベント画像のパス（`public/images/events/` フォルダからの相対パス）

### 3. イベント画像の配置

イベント画像は `public/images/events/` フォルダに配置してください：

```
public/
  images/
    events/
      0513.png
      0624.png
```

### 4. イベントの公開

新しいイベントを公開するには：

1. `public/data/events.json` にイベントデータを追加
2. イベント画像を `public/images/events/` に配置
3. 日付の新しい順で自動的に並びます
