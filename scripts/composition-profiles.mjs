/**
 * 생성 명령·생성물 lock·검사기가 받는 구성 이름(Phase 2 11단계 C8). 인증 시작 구성 id 는 매니페스트 v2 의
 * `config/modules/presets.json` 이 정한다 — 스크립트는 시작 구성 이름을 리터럴로 열거하지 않고 여기서 읽는다. 그래야 시작 구성을
 * 더할 때(13b) 검사기가 새 구성을 모르는 이름으로 거부하거나 검증 범위에서 빼지 않는다. 운영 계약
 * (project-composer-source.test.mjs)이 스크립트의 열거를 막는다.
 *
 * 읽는 곳은 이 스크립트가 속한 저장소다. 원본 체크아웃이면 모든 시작 구성이고, 생성물이면 투영된 presets.json 의 활성 구성
 * 하나(직접 선택 생성물은 `custom`)다 — 생성물의 스크립트는 자기 lock 만 검사하므로 그 하나면 된다. 시험이 만든 합성 생성물도 원본
 * 스크립트로 검사하므로 원본의 시작 구성을 쓴다.
 *
 * Node 내장 모듈만 쓴다. 의존성 설치 전 분류 단계와 독립 이관 제품(시작 구성 선언이 없다)에서도 import 된다. 선언을 읽지 못하거나
 * 모양이 다르면 실패한다 — 조용히 빈 목록이나 옛 이름으로 두지 않는다.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** 시작 구성 선언(저장소 기준 경로). */
export const PRESET_DECLARATIONS = 'config/modules/presets.json';
/** 직접 선택 구성의 이름. 생성물 lock·검토 원장의 profile 로 시작 구성 id 와 함께 쓴다. */
export const CUSTOM_COMPOSITION = 'custom';
const PRESET_ID = /^[a-z][a-z0-9]*$/;

/** 인증 시작 구성 id(presets.json 의 선언 순서). */
export function presetIds(root = REPOSITORY_ROOT) {
  let declared;
  try {
    declared = JSON.parse(readFileSync(join(resolve(root), PRESET_DECLARATIONS), 'utf8'));
  } catch (error) {
    throw new Error(`시작 구성 선언을 읽지 못했다: ${PRESET_DECLARATIONS} (${error instanceof Error ? error.message : String(error)})`);
  }
  const ids = Array.isArray(declared?.presets) ? declared.presets.map(preset => preset?.id) : [];
  if (!ids.length || ids.some(id => typeof id !== 'string' || !PRESET_ID.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error(`${PRESET_DECLARATIONS} 의 시작 구성 id 가 비었거나 형식이 다르거나 겹친다: ${JSON.stringify(ids)}`);
  }
  return ids;
}

/** 생성물 lock·검토 원장의 profile 로 받을 수 있는 이름 — 시작 구성 id 와 직접 선택(`custom`). */
export function compositionProfiles(root = REPOSITORY_ROOT) {
  return [...new Set([...presetIds(root), CUSTOM_COMPOSITION])];
}
