# KOBO の Web サイト作るぞ！

### 開発者

[臼井義人](https://www.usuiyoshito.com)，牧野倫太郎

## 記事（Articles）の書き方

このプロジェクトでは、記事は以下の 2 つのファイルで構成されています：

1. **メタデータ**：`public/data/articles.json`
2. **コンテンツ**：`src/content/articles/[id].md`

### 1. メタデータの設定（articles.json）

`public/data/articles.json`に記事のメタデータを追加します：

```json
{
  "articles": [
    {
      "id": "記事のID（URLパスに使用）",
      "title": "記事のタイトル",
      "excerpt": "記事の概要・説明",
      "date": "2025-07-07",
      "author": {
        "name": "著者名",
        "avatar": "/images/著者のアバター画像.jpg"
      },
      "coverImage": "/images/カバー画像.jpg"
    }
  ]
}
```

### 2. コンテンツの作成（Markdown ファイル）

`src/content/articles/[id].md`に記事の内容を作成します：

```markdown
---
title: '記事のタイトル'
date: '2025-07-07'
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

### 3. 画像の配置

画像は`public/images/`フォルダに配置してください：

```
public/
  images/
    著者のアバター画像.jpg
    記事のディレクトリ/
        カバー画像.jpg
        記事内で使用する画像.jpg
```

### 4. URL 構造

記事の URL は以下のようになります：

- `http://localhost:3000/articles/[id]`

例：ID が`3DPRINT`の記事の場合

- `http://localhost:3000/articles/3DPRINT`

### 5. 目次の自動生成

Markdown ファイル内の`## `（h2）と`### `（h3）見出しから自動的に目次が生成されます。

### 注意点

- `articles.json`の`id`と`.md`ファイル名は必ず一致させてください
- 画像パスは`public/`フォルダからの相対パスで指定してください
- 日付は`YYYY-MM-DD`形式で記載してください
