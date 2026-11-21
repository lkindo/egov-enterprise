import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RICH_TEXT_CONTENT_CLASSES } from '../rich-text-styles';

const SRC = resolve(__dirname, '..', '..');
const PACKAGE_JSON = resolve(SRC, '..', 'package.json');

function productionSources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' || name === 'generated-zod' || name === 'generated-operations' ? [] : productionSources(path);
    }
    return /\.(tsx?|jsx?)$/.test(name) && !/\.(test|spec)\./.test(name) ? [path] : [];
  });
}

describe('rich text content styles', () => {
  it('draws headings, lists, quotes and code that the board editor can produce', () => {
    const classes = RICH_TEXT_CONTENT_CLASSES.split(' ');
    expect(classes).toEqual(expect.arrayContaining([
      '[&_h1]:text-2xl', '[&_h2]:text-xl', '[&_h3]:text-lg',
      '[&_ul]:list-disc', '[&_ol]:list-decimal', '[&_ul]:pl-6', '[&_ol]:pl-6',
      '[&_blockquote]:border-l-4', '[&_code]:font-mono', '[&_a]:underline',
    ]));
  });

  it('does not lean on typography plugin classes that no stylesheet defines', () => {
    const dependencies = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    // 플러그인을 들이지 않기로 했다(rich-text-styles.ts) — 들이면 이 시험과 그 결정을 함께 바꾼다.
    expect(dependencies.dependencies?.['@tailwindcss/typography']).toBeUndefined();
    expect(dependencies.devDependencies?.['@tailwindcss/typography']).toBeUndefined();

    const offenders = productionSources(SRC)
      .filter((path) => /["'`\s](?:dark:)?prose(?:-[a-z0-9]+)?(?=[\s"'`:])/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path).replaceAll('\\', '/'));
    expect(offenders).toEqual([]);
  });
});
