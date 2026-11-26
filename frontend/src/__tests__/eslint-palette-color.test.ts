// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RULE = 'local-theme/enforce-design-tokens';

/**
 * 팔레트 원색 판정은 eslint.config.mjs 의 local-theme/enforce-design-tokens 하나다(2026-11-18 DEC-OPS-420). 종전에는 이 규칙이
 * className 의 일부 원색만 보고, 상태색·중립·브랜드 액센트와 cva 변형·조건식의 문자열은 vitest 가드 두 개(status-color-guard·
 * hardcoded-color-guard)가 파일별 동결표로 셌다. 그 두 가드가 실제로 잡던 형태와, 동결 표지(palette-frozen)가 허용한 것만 푸는지를
 * 실제 설정으로 확인한다.
 */
async function lint(source: string, filePath = 'src/app/__rule_probe__/Probe.tsx') {
  const eslint = new ESLint({ cwd: FRONTEND_DIR });
  const [result] = await eslint.lintText(source, { filePath: join(FRONTEND_DIR, filePath) });
  return result.messages.filter((message) => message.ruleId === RULE).map((message) => message.message);
}

const palette = async (source: string, filePath?: string) =>
  (await lint(source, filePath)).filter((message) => message.startsWith('팔레트 원색')).map((message) => /'([^']+)'/.exec(message)?.[1]);

const REASON = '-- 히트맵 명암 스케일';

describe('팔레트 원색 금지 (local-theme/enforce-design-tokens)', () => {
  it('상태색·중립·브랜드 액센트를 className·cva 변형·조건식·템플릿 문자열·정규식 어디서든 잡는다', async () => {
    expect(await palette(`
const variants = { danger: 'border-rose-500 text-rose-700', calm: 'bg-slate-100' };
export function Probe({ ok }: { ok: boolean }) {
  return <p className={ok ? 'text-emerald-600' : \`hover:bg-amber-50/80 \${variants.danger}\`}>상태</p>;
}
export const Sneaky = () => <p className={/bg-red-500/.source}>x</p>;
`)).toEqual(['border-rose-500, text-rose-700', 'bg-slate-100', 'text-emerald-600', 'bg-amber-50/80', 'bg-red-500']);
  });

  it('시맨틱 토큰·주석·시험 파일은 잡지 않는다', async () => {
    expect(await palette(`
// 예전 색(text-slate-300)을 토큰으로 바꿨다
export function Probe() {
  return <p className="text-destructive-emphasis border-input bg-card">상태</p>;
}
`)).toEqual([]);
    expect(await palette(`export const fixture = 'text-red-500';\n`, 'src/app/__rule_probe__/__tests__/Probe.test.tsx')).toEqual([]);
  });

  it('globals.css @theme 에 없는 시맨틱 상태색은 잡고, 정의된 이름·불투명도·변형 접두·CSS 변수 안의 이름은 잡지 않는다', async () => {
    // [2026-11-26] text-warning-emphasis 는 토큰이 없어 Tailwind 가 클래스를 만들지 않는다 — 17개 파일 21곳의 경고 글자색이 조용히 빠져 있었다.
    const undefinedNames = async (source: string) =>
      (await lint(source)).filter((message) => message.startsWith('정의되지 않은 시맨틱 색')).map((message) => /'([^']+)'/.exec(message)?.[1]);
    expect(await undefinedNames(`
const tones = { warn: 'bg-warning/15 text-warning-emphasis' };
export function Probe({ ok }: { ok: boolean }) {
  return <p className={ok ? 'hover:border-info-subtle/40' : tones.warn}>상태</p>;
}
`)).toEqual(['warning-emphasis', 'info-subtle']);
    // 방향 테두리·숫자 단계(Codex 검토 2026-11-26)와 화면 클래스를 담는 .ts 색상표.
    expect(await undefinedNames(`
export const Probe = () => <p className="hover:border-t-warning-emphasis bg-warning-500 border-bs-info-subtle">x</p>;
`)).toEqual(['warning-emphasis, warning-500, info-subtle']);
    expect((await lint(`export const TONE = { color: 'text-warning-emphasis' };\n`, 'src/app/__rule_probe__/probe-model.ts'))
      .filter((message) => message.startsWith('정의되지 않은 시맨틱 색'))).toHaveLength(1);
    expect(await undefinedNames(`
export function Probe() {
  return <p className="text-success-emphasis bg-destructive/15 dark:text-destructive-emphasis ring-offset-primary text-primary-foreground/80 text-[color:var(--warning-emphasis)]">상태</p>;
}
`)).toEqual([]);
  });

  it('동결 표지는 그 줄에서 허용한 클래스와 개수만 풀고, 같은 줄의 새 원색·흰 배경은 그대로 잡는다', async () => {
    expect(await lint(`
export function Probe() {
  // palette-frozen: bg-sky-100 bg-sky-300 bg-sky-100 ${REASON}
  const scale = ['bg-sky-100', 'bg-sky-300', 'bg-sky-100'];
  return <p className="text-foreground">{scale.join(' ')}</p>;
}
`)).toEqual([]);
    // 표지가 있는 줄에 새 원색을 더하면(종전 동결표의 개수 증가) 붉다.
    expect(await palette(`
export function Probe() {
  {/* palette-frozen: text-rose-500 ${REASON} */}
  return <p className="text-rose-500 text-green-700">x</p>;
}
`)).toEqual(['text-green-700']);
    // 같은 클래스를 하나 더 쓰면 개수가 넘친다.
    expect(await palette(`
export const Probe = () => (
  // palette-frozen: text-rose-500 ${REASON}
  <p className={\`text-rose-500 \${'text-rose-500'}\`}>x</p>
);
`)).toEqual(['text-rose-500']);
    // 표지는 팔레트만 푼다 — 불투명 흰 배경 검사는 꺼지지 않는다.
    expect((await lint(`
export const Probe = () => (
  // palette-frozen: text-rose-500 ${REASON}
  <p className="text-rose-500 bg-white">x</p>
);
`)).map((message) => message.split(' 사용이')[0])).toEqual(["불투명 'bg-white'"]);
  });

  it('고쳐서 사라진 클래스가 남은 표지, 사유 없는 표지, 원색이 아닌 항목은 붉다', async () => {
    expect(await lint(`
export const Probe = () => (
  // palette-frozen: text-rose-500 bg-rose-50 ${REASON}
  <p className="text-rose-500">x</p>
);
`)).toEqual([expect.stringMatching(/^동결 표지의 'bg-rose-50' 이\(가\) 다음 줄에 없습니다/)]);
    expect(await lint(`
export const Probe = () => (
  // palette-frozen: text-rose-500
  <p className="text-foreground">x</p>
);
`)).toEqual([expect.stringMatching(/^동결 표지 'palette-frozen:' 이 잘못됐습니다/)]);
    expect(await lint(`
export const Probe = () => (
  // palette-frozen: text-destructive ${REASON}
  <p className="text-foreground">x</p>
);
`)).toEqual([expect.stringMatching(/원색 클래스가 아닌 항목: text-destructive/)]);
  });

  it('생산 소스는 이 규칙을 eslint-disable 주석으로 끄지 않는다 — 동결은 palette-frozen 표지로만 한다', () => {
    const files = productionSourceFiles(join(FRONTEND_DIR, 'src'), ['.tsx', '.jsx', '.ts']);
    expect(files.length).toBeGreaterThan(50);
    const disabled = files.filter((file) => /eslint-disable[^\n]*local-theme\/enforce-design-tokens/.test(readFileSync(file, 'utf8')));
    expect(disabled).toEqual([]);
  });
});
