import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeShiki from '@shikijs/rehype';
import { visit, SKIP } from 'unist-util-visit';
import { toString as mdastToString } from 'mdast-util-to-string';
import { toString as hastToString } from 'hast-util-to-string';
import type { Root as MdastRoot } from 'mdast';
import type { Element, ElementContent, Root as HastRoot } from 'hast';
import { VFile } from 'vfile';

export interface Section {
  id: string;
  title: string;
  level: number;
}

export interface RenderedMarkdown {
  tree: HastRoot;
  sections: Section[];
}

function remarkLinkCards() {
  return (tree: MdastRoot) => {
    visit(tree, 'paragraph', (node, _index, parent) => {
      if (parent?.type !== 'root') return;
      const children = node.children.filter(
        (child) => !(child.type === 'text' && child.value.trim() === '')
      );
      if (children.length !== 1) return;
      const [link] = children;
      if (link.type !== 'link' || !/^https?:\/\//.test(link.url)) return;
      if (!link.children.every((child) => child.type === 'text')) return;
      node.data = {
        hName: 'link-card',
        hProperties: { url: link.url },
        hChildren: [],
      };
    });
  };
}

function slugify(title: string, index: number): string {
  return (
    title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w -￿-]/g, '')
      .replace(/^-+|-+$/g, '') || `section-${index}`
  );
}

function rehypeSections() {
  return (tree: HastRoot, file: VFile) => {
    const sections: Section[] = [];
    const used = new Map<string, number>();
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const title = hastToString(node).trim();
      if (!title) return;
      const base = slugify(title, sections.length);
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count}`;
      node.properties.id = id;
      sections.push({ id, title, level: node.tagName === 'h2' ? 2 : 3 });
    });
    file.data.sections = sections;
  };
}

function meaningful(nodes: ElementContent[]): ElementContent[] {
  return nodes.filter(
    (node) =>
      node.type !== 'comment' &&
      !(node.type === 'text' && node.value.trim() === '')
  );
}

function isCaption(node: ElementContent): node is Element {
  return (
    node.type === 'element' && (node.tagName === 'em' || node.tagName === 'i')
  );
}

function nextElementIndex(siblings: ElementContent[], from: number): number {
  for (let i = from + 1; i < siblings.length; i++) {
    const node = siblings[i];
    if (node.type === 'text' && node.value.trim() === '') continue;
    return i;
  }
  return -1;
}

function rehypeFigures() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || parent === undefined || index === undefined) {
        return;
      }
      const nodes = meaningful(node.children);
      const image = nodes.find(
        (child) => child.type === 'element' && child.tagName === 'img'
      );
      if (!image) return;
      if (nodes.some((child) => child !== image && child.type === 'text')) {
        return;
      }

      const siblings = parent.children as ElementContent[];
      let caption = nodes.find((child) => child !== image && isCaption(child));
      let removeIndex = -1;

      if (!caption) {
        const nextIndex = nextElementIndex(siblings, index);
        const next = siblings[nextIndex];
        if (next?.type === 'element' && next.tagName === 'p') {
          const inner = meaningful(next.children);
          if (inner.length === 1 && isCaption(inner[0])) {
            caption = inner[0];
            removeIndex = nextIndex;
          }
        }
      }
      if (!caption || caption.type !== 'element') return;

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['article-figure'] },
        children: [
          ...nodes.filter((child) => child !== caption),
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: caption.children,
          },
        ],
      };
      siblings[index] = figure;
      if (removeIndex !== -1) siblings.splice(index + 1, removeIndex - index);
      return [SKIP, index + 1];
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkLinkCards)
  .use(remarkRehype)
  .use(rehypeSections)
  .use(rehypeFigures)
  .use(rehypeShiki, {
    theme: 'dark-plus',
    defaultLanguage: 'text',
    fallbackLanguage: 'text',
    transformers: [
      {
        pre(node) {
          const lang = this.options.lang;
          if (lang && lang !== 'text') node.properties['data-language'] = lang;
        },
      },
    ],
  });

export async function renderMarkdown(source: string): Promise<RenderedMarkdown> {
  const file = new VFile(source);
  const tree = await processor.run(processor.parse(source), file);
  return {
    tree,
    sections: (file.data.sections as Section[] | undefined) ?? [],
  };
}

export function markdownToPlainText(source: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
  return tree.children
    .filter((node) => node.type !== 'code' && node.type !== 'html')
    .map((node) => mdastToString(node).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}
