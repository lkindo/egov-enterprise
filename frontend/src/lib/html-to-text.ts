import DOMPurify from 'isomorphic-dompurify';

const SEMANTIC_BREAK_ELEMENTS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DT', 'DD',
  'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE',
  'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
]);

/** Parse rich text in both browser and server; never strip markup with regex. */
export function htmlToSemanticPlainText(html: string): string {
  if (!html) return '';
  const fragment = DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    FORBID_TAGS: ['script', 'style', 'template', 'noscript'],
    FORBID_CONTENTS: ['script', 'style', 'template', 'noscript'],
  });
  const fragments: string[] = [];
  const collectText = (node: Node) => {
    if (node.nodeType === 3) {
      fragments.push(node.textContent ?? '');
      return;
    }
    if (node.nodeType !== 1) return;
    const isBreak = node.nodeName === 'BR';
    const isBoundary = SEMANTIC_BREAK_ELEMENTS.has(node.nodeName);
    if (isBreak || isBoundary) fragments.push('\n');
    if (!isBreak) node.childNodes.forEach(collectText);
    if (isBoundary) fragments.push('\n');
  };
  fragment.childNodes.forEach(collectText);
  return fragments.join('')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
