import type { Root } from 'hast';
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import CodeBlock from './CodeBlock';
import LinkCard from './LinkCard';

const components = {
  pre: CodeBlock,
  'link-card': ({ url }: { url: string }) => <LinkCard url={url} />,
} as Partial<Components>;

export default function MarkdownContent({
  tree,
  className,
}: {
  tree: Root;
  className?: string;
}) {
  return (
    <div className={className}>
      {toJsxRuntime(tree, { Fragment, jsx, jsxs, components })}
    </div>
  );
}
