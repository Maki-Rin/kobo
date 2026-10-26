import { toHtml } from 'hast-util-to-html';
import type { Element, ElementContent, Root } from 'hast';
import { renderMarkdown } from '../markdown';

function transform(node: ElementContent): ElementContent {
  if (node.type !== 'element') return node;
  if (node.tagName === 'link-card') {
    const url = String(node.properties.url ?? '');
    return {
      type: 'element',
      tagName: 'a',
      properties: {
        href: url,
        className: ['not-prose', 'my-4', 'block', 'rounded-lg', 'border', 'p-4', 'text-sm', 'no-underline'],
      },
      children: [{ type: 'text', value: `リンクカード: ${url}` }],
    };
  }
  if (node.tagName === 'pre') {
    const language = node.properties['data-language'] ?? node.properties.dataLanguage;
    const wrapper: Element = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['code-block'] },
      children: [node],
    };
    if (language) {
      wrapper.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: { className: ['code-block-language'] },
        children: [{ type: 'text', value: String(language) }],
      });
    }
    return wrapper;
  }
  return { ...node, children: node.children.map(transform) };
}

export async function renderPreviewHtml(body: string): Promise<string> {
  const { tree } = await renderMarkdown(body);
  const root: Root = { ...tree, children: tree.children.map((n) => (n.type === 'doctype' ? n : transform(n as ElementContent))) };
  return toHtml(root);
}
