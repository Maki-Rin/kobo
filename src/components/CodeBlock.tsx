'use client';

import { useEffect, useRef } from 'react';

// Prism.jsのグローバル宣言
declare global {
  interface Window {
    Prism: {
      highlightElement: (element: HTMLElement) => void;
      highlightAll: () => void;
    };
  }
}

export default function CodeBlock({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const articleRef = useRef<HTMLDivElement>(null);

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
      pre.style.margin = '1.5rem 0';
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
      if (window.Prism) {
        window.Prism.highlightElement(code);
      }

      // preタグにボタンを追加
      pre.appendChild(copyButton);
    });
  }, []);

  // Prism.js用のCSSをheadに追加
  useEffect(() => {
    // 既にスタイルが追加されていないか確認
    if (!document.getElementById('prism-styles')) {
      const prismStyles = document.createElement('link');
      prismStyles.id = 'prism-styles';
      prismStyles.rel = 'stylesheet';
      prismStyles.href =
        'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/themes/prism-tomorrow.min.css';
      document.head.appendChild(prismStyles);

      // Prism.js本体を読み込み
      const prismScript = document.createElement('script');
      prismScript.src =
        'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/prism.min.js';
      prismScript.async = true;
      document.head.appendChild(prismScript);

      // 言語別のプラグイン（主要な言語）
      const languages = [
        'javascript',
        'css',
        'markup',
        'python',
        'bash',
        'java',
        'typescript',
        'jsx',
        'tsx',
      ];
      languages.forEach((lang) => {
        const langScript = document.createElement('script');
        langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/components/prism-${lang}.min.js`;
        langScript.async = true;
        document.head.appendChild(langScript);
      });
    }
  }, []);

  return (
    <div
      ref={articleRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
