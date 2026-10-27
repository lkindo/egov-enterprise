// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RULE = 'local-query/no-render-state-in-mutation-fn';

/**
 * mutationFn 이 렌더 상태를 클로저로 읽으면 막는 저장소 규칙(eslint.config.mjs)을 실제 설정으로 돌린다.
 * 첫 사례는 2026-09 권한 매핑 저장이 본문 [] 로 간헐 실패하던 실제 코드(75e7ef349 직전)다.
 */
async function flagged(source: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: FRONTEND_DIR });
  const [result] = await eslint.lintText(source, { filePath: join(FRONTEND_DIR, 'src/app/__rule_probe__/Probe.tsx') });
  return result.messages.filter((m) => m.ruleId === RULE).map((m) => /'([^']+)'/.exec(m.message)?.[1] ?? m.message);
}

const header = `import { useReducer, useState } from 'react';
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
declare const authorAdminService: { saveAuthorRoles(code: string, ids: string[]): Promise<void> };
declare const api: { save(v: unknown): Promise<void>; remove(id: number): Promise<void> };
`;

describe('mutationFn 의 렌더 상태 클로저 금지', () => {
  it('권한 매핑 저장의 실제 결함 코드를 잡는다', async () => {
    expect(await flagged(`${header}
export function SecurityHubClient() {
  const [selectedAuthorCode, setSelectedAuthorCode] = useState<string>('');
  const [tempRoleMappings, setTempRoleMappings] = useState<Set<string>>(new Set());
  const saveAuthorRoleMutation = useMutation({
    mutationFn: () => authorAdminService.saveAuthorRoles(selectedAuthorCode, Array.from(tempRoleMappings)),
  });
  return <button onClick={() => { setSelectedAuthorCode(''); setTempRoleMappings(new Set()); saveAuthorRoleMutation.mutate(); }}>저장</button>;
}
`), '권한 매핑 저장이 한 렌더 전 상태를 보내는 결함을 놓쳤다').toEqual(['selectedAuthorCode', 'tempRoleMappings']);
  });

  it('매개변수를 받아도 함수 몸체가 상태를 읽으면 잡는다', async () => {
    expect(await flagged(`${header}
export function Panel() {
  const [editing] = useState<{ sn: number } | null>(null);
  const [state] = useReducer((s: number) => s, 0);
  const [count = 0] = React.useState<number>();
  const save = useMutation({
    mutationFn: async (payload: string) => { await api.save({ payload, sn: editing?.sn, state, count }); },
  });
  return <button onClick={() => save.mutate('x')}>저장</button>;
}
`)).toEqual(['editing', 'state', 'count']);
  });

  it('변수로 받은 값·setter·props·고정 경로 값은 허용한다', async () => {
    expect(await flagged(`${header}
export function Detail({ id }: { id: number }) {
  const [editing, setEditing] = useState<{ sn: number } | null>(null);
  const remove = useMutation({ mutationFn: () => api.remove(id) });
  const save = useMutation({
    mutationFn: ({ payload, target }: { payload: string; target: { sn: number } | null }) => {
      setEditing(null);
      return api.save({ payload, sn: target?.sn });
    },
  });
  return <button onClick={() => { remove.mutate(); save.mutate({ payload: 'x', target: editing }); }}>저장</button>;
}
`)).toEqual([]);
  });
});
