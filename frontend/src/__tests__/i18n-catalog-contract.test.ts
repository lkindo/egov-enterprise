import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import ko from '../../messages/ko.json';
import en from '../../messages/en.json';
import { REQUEST_PATHNAME_HEADER, TRANSLATED_SURFACES, effectiveLocale, isTranslatedRoute } from '@/i18n/surfaces';

/**
 * 화면 카탈로그 완결성(ADR-0063 결정 5). 한국어·영어 카탈로그는 같은 키를 갖고, 번역을 마친 화면의 파일은 고정 문구를 모두 카탈로그에서
 * 그린다(주석·정규식 밖의 문자열·JSX 글자에 한글이 남지 않는다). 그 파일이 가져오는 다른 모듈에 한글 문구가 있으면, 화면에 닿지 않는
 * 이름만 가져오는지 아래 허용 목록으로 본다. 번역 키(`t('…')`·`catalogKey('…')`)의 오타는 타입 검사가 막는다(use-intl-config.d.ts).
 * 렌더 결과의 완결성(표지 없는 한글이 없다)은 login-english 렌더 시험과 E2E 가 본다.
 */
const FRONTEND = path.resolve(__dirname, '..', '..');

/**
 * 번역 화면 파일이 가져와도 되는, 한글 문구를 가진 모듈과 그 이름. 이름마다 화면에 문구가 닿지 않는 까닭을 적는다. 새 이름을 더하려면
 * 그 값이 화면에 그려지지 않거나(형식·종류 판정) 번역하지 않는 고유 문구(사이트 정체, 결정 6)로서 `lang` 표지를 다는지 확인한다.
 */
const LANGUAGE_NEUTRAL_IMPORTS: Record<string, Record<string, string>> = {
  'src/config/site-identity.ts': {
    SITE_IDENTITY: '사이트 정체(기관·제품 고유 이름) — 번역하지 않고 contentLang 으로 lang="ko" 를 단다(결정 6)',
  },
  'src/lib/auth/login-error.ts': {
    loginErrorKind: 'BFF 응답 본문 문구를 보이지 않고 실패 종류만 돌려준다 — 화면은 카탈로그로 그린다',
  },
  'src/types/generated-zod.ts': {
    LoginRequestSchema: '문구를 적지 않은 생성 계약 스키마(한글은 같은 모듈의 다른 스키마) — 검증 문구는 전역 오류 맵에서 오고 수동 폼 검증이 로케일별로 바꾼다',
  },
  'src/lib/auth/mfa-bff-contract.ts': {
    MFA_CODE_PATTERN: '형식 정규식',
    MFA_RECOVERY_CODE_PATTERN: '형식 정규식',
  },
};

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object') throw new Error(`카탈로그 값이 문자열·객체가 아니다: ${prefix}`);
  return Object.entries(value as Record<string, unknown>)
    .reduce<Record<string, string>>((all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }), {});
}

function parse(file: string): ts.SourceFile {
  const text = fs.readFileSync(path.join(FRONTEND, file), 'utf8');
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

/** 파일의 주석·정규식 밖 문자열·템플릿 조각·JSX 글자 가운데 한글이 든 것. */
function hangulLiterals(file: string): string[] {
  const source = parse(file);
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

function resolveLocalImport(from: string, specifier: string): string | undefined {
  let base: string;
  if (specifier.startsWith('@/')) base = path.join(FRONTEND, 'src', specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(path.join(FRONTEND, from)), specifier);
  else return undefined;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.relative(FRONTEND, candidate).split(path.sep).join('/');
  }
  throw new Error(`${from}: 가져온 모듈을 찾지 못했다 — ${specifier}`);
}

const isSourceModule = (file: string | undefined): file is string => !!file && /\.(ts|tsx)$/.test(file);

/**
 * 모듈이 다른 지역 모듈의 값을 그대로 내보내는 곳 — `export … from`, 가져온 이름의 `export { 이름 }`·`export default 이름`·
 * `export const X = 이름`. 한글 문구를 가진 모듈을 한 번 거쳐 내보내면 거친 모듈에는 한글 글자가 없다(Codex 2차 검토 반례).
 */
function reexportSources(file: string): string[] {
  const source = parse(file);
  const imported = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.importClause?.isTypeOnly) continue;
    const target = resolveLocalImport(file, statement.moduleSpecifier.text);
    if (!isSourceModule(target)) continue;
    const clause = statement.importClause;
    if (clause?.name) imported.set(clause.name.text, target);
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) imported.set(bindings.name.text, target);
    if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) imported.set(element.name.text, target);
  }
  const sources = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const target = resolveLocalImport(file, statement.moduleSpecifier.text);
        if (isSourceModule(target)) sources.add(target);
      } else if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          const origin = imported.get((element.propertyName ?? element.name).text);
          if (origin) sources.add(origin);
        }
      }
    }
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      const origin = imported.get(statement.expression.text);
      if (origin) sources.add(origin);
    }
    if (ts.isVariableStatement(statement) && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of statement.declarationList.declarations) {
        const origin = declaration.initializer && ts.isIdentifier(declaration.initializer) ? imported.get(declaration.initializer.text) : undefined;
        if (origin) sources.add(origin);
      }
    }
  }
  return [...sources];
}

/** 이 모듈이나 이 모듈이 그대로 내보내는 모듈(재수출을 따라)에 한글 문구가 있는가. */
function koreanBearing(file: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false;
  seen.add(file);
  return hangulLiterals(file).length > 0 || reexportSources(file).some((origin) => koreanBearing(origin, seen));
}

/**
 * 번역 화면 파일이 JSX 글자로 그리는 사이트 정체(`{SITE_IDENTITY.키}`)는 감싼 요소가 `lang={contentLang(SITE_IDENTITY.키)}` 를 단다
 * (결정 6) — 도입 기관이 로고 표기·이름을 한글로 바꿔도 영어 화면에서 표지 없는 한글이 생기지 않는다.
 */
function unmarkedIdentity(file: string): string[] {
  const source = parse(file);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxExpression(node) && node.expression && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'SITE_IDENTITY' && ts.isJsxElement(node.parent)) {
      const key = node.expression.name.text;
      const lang = node.parent.openingElement.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'lang');
      const marked = lang && ts.isJsxAttribute(lang) && lang.initializer?.getText(source).replace(/\s/g, '') === `{contentLang(SITE_IDENTITY.${key})}`;
      if (!marked) found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} SITE_IDENTITY.${key}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** 번역 화면 파일이 값으로 가져오는 지역 모듈과 그 이름(타입 전용 가져오기는 화면에 닿지 않아 뺀다). */
function valueImports(file: string): { module: string; names: string[] }[] {
  return parse(file).statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return [];
    const clause = statement.importClause;
    if (clause?.isTypeOnly) return [];
    const target = resolveLocalImport(file, statement.moduleSpecifier.text);
    if (!target || target.endsWith('.json') || target.endsWith('.css')) return [];
    const names: string[] = [];
    if (clause?.name) names.push('default');
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) names.push('*');
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) if (!element.isTypeOnly) names.push((element.propertyName ?? element.name).text);
    }
    return [{ module: target, names }];
  });
}

describe('i18n 카탈로그 완결성 (ADR-0063)', () => {
  const koKeys = flatten(ko);
  const enKeys = flatten(en);
  const surfaceFiles = new Set(TRANSLATED_SURFACES.flatMap((surface) => surface.files));

  it('한국어·영어 카탈로그는 같은 키를 갖고 빈 문구가 없다', () => {
    expect(Object.keys(enKeys).sort()).toEqual(Object.keys(koKeys).sort());
    expect(Object.entries({ ...koKeys }).filter(([, value]) => value.trim() === '').map(([key]) => `ko:${key}`)).toEqual([]);
    expect(Object.entries({ ...enKeys }).filter(([, value]) => value.trim() === '').map(([key]) => `en:${key}`)).toEqual([]);
  });

  it('영어 카탈로그에 한글 문장이 남지 않는다 — 언어 이름(endonym)만 예외다', () => {
    const endonyms = new Set(['locale.ko']);
    expect(Object.entries(enKeys).filter(([key, value]) => !endonyms.has(key) && /[가-힣]/.test(value)).map(([key]) => key)).toEqual([]);
  });

  it('번역 원장의 화면은 실제 경로이고 정확히 그 경로만이며, 그 파일은 고정 문구를 모두 카탈로그에서 그린다', () => {
    expect(TRANSLATED_SURFACES.length).toBeGreaterThan(0);
    for (const surface of TRANSLATED_SURFACES) {
      for (const route of surface.routes) {
        expect(fs.existsSync(path.join(FRONTEND, 'src', 'app', ...route.split('/').filter(Boolean), 'page.tsx')), `${surface.id}: ${route}`).toBe(true);
        expect(isTranslatedRoute(route)).toBe(true);
        expect(isTranslatedRoute(`${route}/`)).toBe(true);
        expect(isTranslatedRoute(`${route}/child`), '아래 경로를 저절로 번역 화면으로 보지 않는다').toBe(false);
      }
      for (const file of surface.files) expect(fs.existsSync(path.join(FRONTEND, file)), `${surface.id}: ${file}`).toBe(true);
    }
    const leftovers = [...surfaceFiles].flatMap(hangulLiterals);
    expect(leftovers, '번역을 마친 화면 파일에 한글 고정 문구가 남았다 — 카탈로그로 옮긴다').toEqual([]);
    expect(isTranslatedRoute('/loginx')).toBe(false);
    expect(isTranslatedRoute(null)).toBe(false);
    expect(effectiveLocale('en', null), '경로를 모르면 한국어로 그린다').toBe('ko');
  });

  it('번역 화면 파일은 한글 문구를 가진 다른 모듈에서 화면에 닿지 않는 이름만 가져온다', () => {
    const violations: string[] = [];
    const used = new Map<string, Set<string>>();
    for (const file of surfaceFiles) {
      for (const { module, names } of valueImports(file)) {
        if (surfaceFiles.has(module) || !isSourceModule(module) || !koreanBearing(module)) continue;
        const allowed = LANGUAGE_NEUTRAL_IMPORTS[module] ?? {};
        for (const name of names) {
          if (name in allowed) used.set(module, (used.get(module) ?? new Set()).add(name));
          else violations.push(`${file} → ${module}#${name}`);
        }
      }
    }
    expect(violations, '한글 문구를 가진 모듈에서 허용 목록 밖의 이름을 가져왔다 — 그 문구를 카탈로그로 옮기거나 화면에 닿지 않음을 확인해 적는다').toEqual([]);
    // 허용 목록이 낡지 않게 — 아무도 가져오지 않는 항목은 걷는다.
    const stale = Object.entries(LANGUAGE_NEUTRAL_IMPORTS).flatMap(([module, names]) =>
      Object.keys(names).filter((name) => !used.get(module)?.has(name)).map((name) => `${module}#${name}`));
    expect(stale).toEqual([]);
  });

  it('번역 화면 파일이 글자로 그리는 사이트 정체는 내용 언어 표지를 단다', () => {
    const scanned = [...surfaceFiles].filter((file) => fs.readFileSync(path.join(FRONTEND, file), 'utf8').includes('{SITE_IDENTITY.'));
    expect(scanned.length, '사이트 정체를 그리는 번역 화면 파일이 없다 — 검사가 빈다').toBeGreaterThan(0);
    expect(scanned.flatMap(unmarkedIdentity)).toEqual([]);
  });

  it('proxy 는 레이아웃이 읽는 요청 경로 헤더를 문서 요청마다 덮어 싣는다', () => {
    const proxy = fs.readFileSync(path.join(FRONTEND, 'src', 'proxy.ts'), 'utf8');
    expect(proxy).toContain('requestHeaders.set(REQUEST_PATHNAME_HEADER, pathname);');
    expect(REQUEST_PATHNAME_HEADER).toBe('x-app-pathname');
  });
});
