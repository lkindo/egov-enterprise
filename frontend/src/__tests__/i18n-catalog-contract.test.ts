import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import ko from '../../messages/ko.json';
import en from '../../messages/en.json';
import { TRANSLATED_SURFACES, isTranslatedRoute } from '@/i18n/surfaces';

/**
 * 화면 카탈로그 완결성(ADR-0063 결정 5). 한국어·영어 카탈로그는 같은 키를 갖고, 번역을 마친 화면의 파일은 고정 문구를 모두 카탈로그에서
 * 그린다(주석·정규식 밖의 문자열·JSX 글자에 한글이 남지 않는다). 스키마가 적은 카탈로그 키(`catalogKey('…')`)는 실제로 있어야 한다.
 */
const FRONTEND = path.resolve(__dirname, '..', '..');

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object') throw new Error(`카탈로그 값이 문자열·객체가 아니다: ${prefix}`);
  return Object.entries(value as Record<string, unknown>)
    .reduce<Record<string, string>>((all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }), {});
}

/** 파일의 주석·정규식 밖 문자열·템플릿 조각·JSX 글자 가운데 한글이 든 것. */
function hangulLiterals(file: string): string[] {
  const text = fs.readFileSync(path.join(FRONTEND, file), 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    const literal = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)
      || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node);
    if (literal && /[가-힣]/.test(node.text)) {
      found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.text.trim().slice(0, 40)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('i18n 카탈로그 완결성 (ADR-0063)', () => {
  const koKeys = flatten(ko);
  const enKeys = flatten(en);

  it('한국어·영어 카탈로그는 같은 키를 갖고 빈 문구가 없다', () => {
    expect(Object.keys(enKeys).sort()).toEqual(Object.keys(koKeys).sort());
    expect(Object.entries({ ...koKeys }).filter(([, value]) => value.trim() === '').map(([key]) => `ko:${key}`)).toEqual([]);
    expect(Object.entries({ ...enKeys }).filter(([, value]) => value.trim() === '').map(([key]) => `en:${key}`)).toEqual([]);
  });

  it('영어 카탈로그에 한글 문장이 남지 않는다 — 언어 이름(endonym)만 예외다', () => {
    const endonyms = new Set(['locale.ko']);
    expect(Object.entries(enKeys).filter(([key, value]) => !endonyms.has(key) && /[가-힣]/.test(value)).map(([key]) => key)).toEqual([]);
  });

  it('번역 원장의 화면은 실제 경로이고, 그 파일은 고정 문구를 모두 카탈로그에서 그린다', () => {
    expect(TRANSLATED_SURFACES.length).toBeGreaterThan(0);
    for (const surface of TRANSLATED_SURFACES) {
      for (const route of surface.routes) {
        expect(fs.existsSync(path.join(FRONTEND, 'src', 'app', ...route.split('/').filter(Boolean), 'page.tsx')), `${surface.id}: ${route}`).toBe(true);
        expect(isTranslatedRoute(route)).toBe(true);
        expect(isTranslatedRoute(`${route}/child`)).toBe(true);
      }
      for (const file of surface.files) expect(fs.existsSync(path.join(FRONTEND, file)), `${surface.id}: ${file}`).toBe(true);
    }
    const leftovers = TRANSLATED_SURFACES.flatMap((surface) => surface.files.flatMap(hangulLiterals));
    expect(leftovers, '번역을 마친 화면 파일에 한글 고정 문구가 남았다 — 카탈로그로 옮긴다').toEqual([]);
    expect(isTranslatedRoute('/loginx')).toBe(false);
  });

  it('스키마·코드가 적은 카탈로그 키는 모두 카탈로그에 있다', () => {
    const used = new Set<string>();
    for (const file of sourceFiles(path.join(FRONTEND, 'src'))) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/catalogKey\(\s*'([^']+)'\s*\)/g)) used.add(match[1]);
    }
    expect(used.size, '카탈로그 키를 적은 곳이 없다 — 검사가 빈다').toBeGreaterThan(0);
    expect([...used].filter((key) => !(key in koKeys))).toEqual([]);
  });
});
