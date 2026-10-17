/**
 * 계약·가드가 "코드에 이 문자열이 있다/없다" 를 판정할 때 쓰는 **주석만 지운 소스** — 공용 판정 하나.
 *
 * 종전에는 시험 파일마다 정규식으로 주석을 지웠다. 정규식은 문자열·정규식 리터럴·JSX 를 모른다. 그래서 `'image/*'` 같은
 * 문자열 속 여는 기호가 아래쪽 다른 주석의 닫는 기호까지 이어져 그 사이 실제 코드 수천 자를 지웠고, 그 구간에서는 0 고정
 * 가드(네이티브 확인창·날짜 표기·page-redirect 역참조)가 위반을 넣어도 녹색이었다(FE-CONTRACT-01 실측). 같은 결함을 파일마다
 * 따로 고쳐 왔다. 여기서 한 번만 바르게 판정한다.
 *
 * - TS·TSX·JS·JSX(.mts·.cts·.mjs·.cjs 포함): TypeScript 파서가 문자열·템플릿 조각·정규식 리터럴·JSX 본문의 위치를 알려 주고,
 *   그 밖에서 만나는 `//`·`/*` 만 주석으로 본다. JSX 본문의 `//` 는 글자이고, JSX 식 자리의 블록 주석은 주석이다.
 * - Java: 텍스트 블록(`"""`)을 아는 기존 Java 판정(project-composer-integrations 의 stripComments, kind java)을 그대로 쓴다.
 * - 그 밖의 확장자는 실패한다 — 규칙 없는 형식을 원문으로 돌려주면 주석 속 언급이 조용히 위반으로 세지거나 그 반대가 된다.
 *
 * 주석은 같은 길이의 공백으로 바꾸고 줄바꿈은 남긴다 — 줄 번호와 위치가 원문과 같다. 문자열은 그대로 둔다.
 * 판정 규칙은 scripts/code-without-comments.test.mjs 가 고정한다.
 *
 * productionSourceFiles 는 0 고정 가드들이 같은 모집단(시험·의존성·빌드 산출물을 뺀 생산 소스)을 같은 방식으로 걷게 한다.
 */
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { stripComments } from './project-composer-integrations.mjs';

/** 확장자 → TypeScript ScriptKind 이름. */
const SCRIPT_KINDS = Object.freeze({
  '.ts': 'TS', '.mts': 'TS', '.cts': 'TS', '.tsx': 'TSX',
  '.js': 'JS', '.mjs': 'JS', '.cjs': 'JS', '.jsx': 'JSX',
});

let typescript;
/** TypeScript 는 frontend 의존성이다(루트에는 없다). Java 만 읽는 쪽은 불러오지 않는다. */
function ts() {
  typescript ??= createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
  return typescript;
}

const LINE_BREAK = /[\r\n\u2028\u2029]/g;
const blank = (text) => text.replace(/[^\r\n\u2028\u2029]/g, ' ');

/** 주석이 아닌데 `//`·`/*` 를 담을 수 있는 토큰의 [시작, 끝) — 원문 순서다(템플릿 식 자리의 중첩도 순서대로 나온다). */
function literalRanges(sourceFile, t) {
  const kinds = new Set([
    t.SyntaxKind.StringLiteral,
    t.SyntaxKind.NoSubstitutionTemplateLiteral,
    t.SyntaxKind.TemplateHead,
    t.SyntaxKind.TemplateMiddle,
    t.SyntaxKind.TemplateTail,
    t.SyntaxKind.RegularExpressionLiteral,
  ]);
  const ranges = [];
  const visit = (node) => {
    // JSX 본문은 앞에 trivia 가 없다 — pos 부터가 글자다(getStart 는 앞 공백을 건너뛴다).
    if (node.kind === t.SyntaxKind.JsxText) ranges.push([node.pos, node.end]);
    else if (kinds.has(node.kind)) ranges.push([node.getStart(sourceFile), node.end]);
    else t.forEachChild(node, visit);
  };
  visit(sourceFile);
  return ranges;
}

function scriptWithoutComments(source, fileName, kind) {
  const t = ts();
  const sourceFile = t.createSourceFile(fileName, source, t.ScriptTarget.Latest, false, t.ScriptKind[kind]);
  const parts = [];
  let copied = 0;
  let index = 0;
  // 리터럴 사이의 코드 구간만 훑는다. 주석은 리터럴 안에 있을 수 없으므로 구간 밖으로 이어지지 않는다.
  for (const [start, end] of [...literalRanges(sourceFile, t), [source.length, source.length]]) {
    for (; index < start; index += 1) {
      if (source[index] !== '/' || (source[index + 1] !== '/' && source[index + 1] !== '*')) continue;
      let close;
      if (source[index + 1] === '*') {
        const at = source.indexOf('*/', index + 2);
        close = at < 0 ? source.length : at + 2;
      } else {
        LINE_BREAK.lastIndex = index;
        close = LINE_BREAK.exec(source)?.index ?? source.length;
      }
      parts.push(source.slice(copied, index), blank(source.slice(index, close)));
      copied = close;
      index = close - 1;
    }
    index = Math.max(index, end);
  }
  parts.push(source.slice(copied));
  return parts.join('');
}

/**
 * 주석만 같은 길이의 공백으로 바꾼 소스. `fileName` 의 확장자로 규칙을 고른다(확장자만 본다 — 표시용 상대 경로도 된다).
 * @param {string} source
 * @param {string} fileName
 * @returns {string}
 */
export function codeWithoutComments(source, fileName) {
  const extension = extname(fileName).toLowerCase();
  if (extension === '.java') return stripComments(source, { kind: 'java' });
  const kind = SCRIPT_KINDS[extension];
  if (!kind) throw new Error(`주석 제거 규칙이 없는 파일 형식이다: ${fileName}`);
  return scriptWithoutComments(source, fileName, kind);
}

/** 생산 소스가 아닌 디렉터리 — 시험, 의존성, 빌드 산출물. */
const NOT_PRODUCTION = new Set(['__tests__', 'node_modules', '.next']);

/**
 * 디렉터리 아래 생산 소스 파일의 절대 경로(정렬). `__tests__` 디렉터리와 `*.test.*` 파일, 의존성·빌드 산출물은 뺀다.
 * 확장자만 가드마다 고른다(예: ['.ts', '.tsx', '.jsx'] — `.d.ts` 는 `.ts` 다).
 * @param {string} directory
 * @param {readonly string[]} extensions
 * @returns {string[]}
 */
export function productionSourceFiles(directory, extensions) {
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!NOT_PRODUCTION.has(entry.name)) walk(path);
      } else if (extensions.includes(extname(entry.name)) && !entry.name.includes('.test.')) {
        files.push(path);
      }
    }
  };
  walk(directory);
  return files.sort();
}
