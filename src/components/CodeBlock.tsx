'use client';

import { useEffect, useRef } from 'react';
import LinkCard from './LinkCard';
import Prism from 'prismjs';

// Prism.jsの言語サポートをインポート
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-markup';

// Prism.jsのテーマ
import 'prismjs/themes/prism-tomorrow.css';

interface ProcessedContent {
  html: string;
  urls: string[];
}

function processContentForUrls(content: string): ProcessedContent {
  const urls: string[] = [];

  // HTMLを行ごとに分割
  const lines = content.split('\n');
  const processedLines: string[] = [];

  console.log('Processing content for URLs. Total lines:', lines.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // URLの正規表現パターン
    const urlPatterns = [
      // 段落内の単独のaタグのURL（remark-gfmで変換された後）
      /^<p><a href="(https?:\/\/[^"]+)"[^>]*>[^<]+<\/a><\/p>$/,
      // 段落内の単独のURL（プレーンテキスト）
      /^<p>\s*(https?:\/\/[^\s<>]+)\s*<\/p>$/,
      // 単独のURL（プレーンテキスト）
      /^(https?:\/\/[^\s<>]+)$/,
    ];

    let urlFound = false;
    for (const pattern of urlPatterns) {
      const match = line.match(pattern);
      if (match) {
        const url = match[1];
        console.log('Found URL:', url, 'from line:', line);
        urls.push(url);
        // リンクカード用のプレースホルダーを挿入
        processedLines.push(
          `<div class="link-card-placeholder" data-url="${url}"></div>`
        );
        urlFound = true;
        break;
      }
    }

    if (!urlFound) {
      processedLines.push(lines[i]);
    }
  }

  console.log('Total URLs found:', urls.length);
  return {
    html: processedLines.join('\n'),
    urls,
  };
}

export default function CodeBlock({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const articleRef = useRef<HTMLDivElement>(null);
  const processedContent = processContentForUrls(content);

  // リンクカードを配置する
  useEffect(() => {
    if (!articleRef.current) return;

    const placeholders = articleRef.current.querySelectorAll(
      '.link-card-placeholder'
    );

    placeholders.forEach((placeholder) => {
      const url = placeholder.getAttribute('data-url');
      if (!url) return;

      // プレースホルダーが既に処理されていないかチェック
      if (placeholder.classList.contains('processed')) return;

      placeholder.classList.add('processed');

      // LinkCardコンポーネントを動的にマウント
      import('react').then((React) => {
        import('react-dom/client').then((ReactDOM) => {
          const root = ReactDOM.createRoot(placeholder);
          const LinkCardElement = React.createElement(LinkCard, { url });
          root.render(LinkCardElement);
        });
      });
    });
  }, [processedContent.html]);

  // 記事内のコードブロックを処理する
  useEffect(() => {
    if (!articleRef.current) return;

    // 記事内の全てのpreタグを取得
    const preTags = articleRef.current.querySelectorAll('pre');

    preTags.forEach((pre) => {
      // 既にプロセスされたpreタグはスキップ
      if (pre.classList.contains('processed-code-block')) {
        return;
      }

      // 言語を特定する
      const code = pre.querySelector('code');
      if (!code) return;

      // language-xxxクラスから言語を抽出
      let language = '';
      for (let i = 0; i < code.classList.length; i++) {
        if (code.classList[i].startsWith('language-')) {
          language = code.classList[i].replace('language-', '');
          break;
        }
      }

      // preタグに相対位置を設定
      pre.style.position = 'relative';
      pre.style.backgroundColor = '#1E1E1E'; // VSCode dark theme background
      pre.style.borderRadius = '0.5rem';
      pre.style.paddingTop = '2.5rem';
      pre.style.margin = '0.75rem 0';
      pre.classList.add('processed-code-block');

      // 言語バッジを作成（あれば）
      if (language) {
        const languageBadge = document.createElement('div');
        languageBadge.textContent = language;
        languageBadge.style.position = 'absolute';
        languageBadge.style.top = '0';
        languageBadge.style.left = '1rem';
        languageBadge.style.padding = '0.2rem 0.6rem';
        languageBadge.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        languageBadge.style.color = 'white';
        languageBadge.style.borderRadius = '0 0 4px 4px';
        languageBadge.style.fontSize = '0.75rem';
        languageBadge.style.fontFamily = 'monospace';
        languageBadge.style.zIndex = '10';
        pre.appendChild(languageBadge);
      }

      // コードにスタイルを適用
      if (code) {
        // Prism.jsが適用される前にスタイルを設定
        code.style.fontFamily =
          'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace';
        code.style.fontSize = '0.9rem';
        code.style.lineHeight = '1.5';
        code.style.padding = '0.5rem 1rem';
        code.style.display = 'block';
        code.style.whiteSpace = 'pre';
        code.style.overflow = 'auto';
        code.style.margin = '0';
      }

      // コピーボタンを作成
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;

      // スタイル設定
      copyButton.style.position = 'absolute';
      copyButton.style.top = '8px';
      copyButton.style.right = '8px';
      copyButton.style.background = 'rgba(255, 255, 255, 0.2)';
      copyButton.style.color = 'white';
      copyButton.style.border = 'none';
      copyButton.style.borderRadius = '4px';
      copyButton.style.padding = '6px';
      copyButton.style.width = '32px';
      copyButton.style.height = '32px';
      copyButton.style.display = 'flex';
      copyButton.style.justifyContent = 'center';
      copyButton.style.alignItems = 'center';
      copyButton.style.cursor = 'pointer';
      copyButton.style.transition = 'all 0.2s';
      copyButton.style.opacity = '0.7';
      copyButton.style.zIndex = '20';

      // ホバー時のスタイル
      copyButton.addEventListener('mouseenter', () => {
        copyButton.style.opacity = '1';
        copyButton.style.background = 'rgba(255, 255, 255, 0.3)';
      });

      copyButton.addEventListener('mouseleave', () => {
        copyButton.style.opacity = '0.7';
        copyButton.style.background = 'rgba(255, 255, 255, 0.2)';
      });

      // クリップボードにコピーする機能
      copyButton.addEventListener('click', () => {
        // pre内のテキストを取得
        const codeElement = pre.querySelector('code');
        const text = codeElement ? codeElement.textContent : pre.textContent;

        // クリップボードにコピー
        navigator.clipboard
          .writeText(text || '')
          .then(() => {
            // コピー成功時の表示
            copyButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            `;
            copyButton.style.background = 'rgba(72, 187, 120, 0.7)';

            // 2秒後に元に戻す
            setTimeout(() => {
              copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              `;
              copyButton.style.background = 'rgba(255, 255, 255, 0.2)';
            }, 2000);
          })
          .catch((err) => {
            console.error('クリップボードへのコピーに失敗しました:', err);
            copyButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            `;
            copyButton.style.background = 'rgba(239, 68, 68, 0.7)';

            // 2秒後に元に戻す
            setTimeout(() => {
              copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              `;
              copyButton.style.background = 'rgba(255, 255, 255, 0.2)';
            }, 2000);
          });
      });

      // シンタックスハイライトを適用
      if (code) {
        Prism.highlightElement(code);
      }

      // preタグにボタンを追加
      pre.appendChild(copyButton);
    });
  }, [processedContent.html]);

  return (
    <div
      ref={articleRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: processedContent.html }}
    />
  );
}
