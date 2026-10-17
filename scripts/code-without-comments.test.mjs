import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';

import { codeWithoutComments, productionSourceFiles } from './code-without-comments.mjs';

/*
 * 주석 제거 공용 판정(code-without-comments.mjs)의 규칙. 0 고정 가드들이 이 판정 하나에 기대므로, 문자열·정규식 리터럴·JSX
 * 본문 속의 주석 기호를 주석으로 오인하면 그 뒤 코드 구간이 통째로 가드 밖으로 나간다(FE-CONTRACT-01 실측). 그래서 기대값을
 * 원문과 **글자 단위로** 맞춘다 — 주석 자리만 같은 길이의 공백이고 나머지는 원문 그대로다.
 *
 * 조각 목록에서 원문과 기대값을 함께 만든다. ['c', 텍스트] 는 주석이고 그 밖은 코드다.
 */
function fixture(pieces, newline = '\n') {
  const join = (map) => pieces.map(map).join('').replaceAll('\n', newline);
  return {
    source: join((piece) => (Array.isArray(piece) ? piece[1] : piece)),
    expected: join((piece) => (Array.isArray(piece) ? piece[1].replace(/[^\n]/g, ' ') : piece)),
  };
}

const TS = [
  // 문자열 속 주석 기호 — 종전 정규식은 여기서 블록 주석을 열어 아래 코드를 지웠다.
  "const accept = '*/*';\n",
  "const image = 'image/*', route = '/cop/cmy/selectCommunityDetail/*';\n",
  'const url = "https://example.org/a//b";\n',
  // 정규식 리터럴 속 주석 기호와 따옴표 — 원문 그대로의 `//`·`/*`(문자 클래스 안)도 정규식이다.
  "const slashStar = /\\/\\*/g, quote = /'/, scheme = /https?:\\/\\//, star = /[/*]/;\n",
  ['c', "// 사용자's 설명 — 작은따옴표가 든 한글 주석\n"],
  ['c', "/* 블록 'x' */"], " window.confirm('KEEP-1');\n",
  // 템플릿: 글자 부분의 기호는 글자이고 식 자리의 주석은 주석이다.
  'const template = `a//b ${', ['c', '/* 식 자리 */'], " 1 } /* 글자 */ ${`중첩 //`}`;\n",
  "window.confirm('KEEP-2'); ", ['c', '// 줄 끝 주석'], '\n',
  ['c', '/**\n * 문서 주석 \'인용\'\n */'], '\n',
  'export {};',
];

const TSX = [
  'export const Drop = () => (\n',
  '  <div className="a//b" data-accept=\'*/*\'>\n',
  '    {', ['c', '/* Drop Zone */'], '}\n',
  "    http://jsx-text // JSX 본문의 기호는 글자다 /* 이것도 */\n",
  "    <span>don't {'/*'}</span>\n",
  '  </div>\n',
  ');\n',
  ['c', '// 마지막 줄 주석'],
];

const JAVA = [
  'class A {\n',
  '  String block = """\n',
  '    /* 텍스트 블록 속 */ // 기호\n',
  '    """;\n',
  '  String open = "/*"; ', ['c', '// 줄 끝 주석'], '\n',
  "  char quote = '\"'; char slash = '/';\n",
  '  ', ['c', "/* 블록 '인용' */"], ' int keep = 1;\n',
  '  String url = "https://example.org"; ', ['c', '/* 끝 */'], '\n',
  '}\n',
];

test('TS: 문자열·정규식·템플릿 글자 속 주석 기호는 코드로 두고 주석만 같은 길이 공백으로 바꾼다', () => {
  const { source, expected } = fixture(TS);
  assert.equal(codeWithoutComments(source, 'fixture.ts'), expected);
});

test('TSX: JSX 본문의 // 는 글자이고 JSX 식 자리의 블록 주석은 주석이다', () => {
  const { source, expected } = fixture(TSX);
  assert.equal(codeWithoutComments(source, 'fixture.tsx'), expected);
  // 확장자로 규칙을 고른다 — .jsx 도 같은 판정이다.
  assert.equal(codeWithoutComments(source, 'components/fixture.jsx'), expected);
});

test('JS 계열 확장자(.js·.mjs·.cjs·.mts·.cts)도 같은 판정이다', () => {
  const { source, expected } = fixture(TS);
  for (const name of ['a.js', 'a.mjs', 'a.cjs', 'a.mts', 'a.cts', 'types/a.d.ts']) {
    assert.equal(codeWithoutComments(source, name), expected, name);
  }
});

test('Java: 텍스트 블록·문자열·문자 리터럴 속 기호는 코드로 둔다', () => {
  const { source, expected } = fixture(JAVA);
  assert.equal(codeWithoutComments(source, 'nuri/A.java'), expected);
});

test('CRLF 줄 끝과 위치를 보존한다 — 줄 번호가 원문과 같다', () => {
  for (const [pieces, name] of [[TS, 'a.ts'], [TSX, 'a.tsx'], [JAVA, 'A.java']]) {
    const { source, expected } = fixture(pieces, '\r\n');
    const code = codeWithoutComments(source, name);
    assert.equal(code, expected, name);
    assert.equal(code.length, source.length, name);
  }
});

test('규칙이 없는 형식은 원문을 돌려주지 않고 실패한다', () => {
  for (const name of ['a.css', 'a.sql', 'a.json', 'Makefile']) {
    assert.throws(() => codeWithoutComments('/* x */', name), /주석 제거 규칙이 없는 파일 형식/, name);
  }
});

test('생산 소스 모집단은 시험·의존성·빌드 산출물을 빼고 고른 확장자만 정렬해 돌려준다', () => {
  const root = mkdtempSync(join(tmpdir(), 'code-without-comments-'));
  try {
    for (const file of ['b.ts', 'a.tsx', 'types/api.d.ts', 'x.test.ts', 'y.test.tsx', 'style.css', 'z.jsx',
      '__tests__/c.ts', 'node_modules/d.ts', '.next/e.ts', 'sub/__tests__/f.tsx', 'sub/g.ts']) {
      mkdirSync(join(root, dirname(file)), { recursive: true });
      writeFileSync(join(root, file), '');
    }
    const found = productionSourceFiles(root, ['.ts', '.tsx']).map((path) => relative(root, path).split(sep).join('/'));
    assert.deepEqual(found, ['a.tsx', 'b.ts', 'sub/g.ts', 'types/api.d.ts']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
