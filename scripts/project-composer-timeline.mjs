/*
 * 생성 작업의 진행 타임라인과 작업 이력 색인(설계서 14.3·20장, E6a).
 *   - 타임라인: 다섯 단계(구성 확인·DB·소스·설치·검증)와 검증 일곱 단계의 상태·시작 시각·소요 시간. 진행률은 단계가 끝날 때만
 *     가중치만큼 오른다. 시간으로 짐작해 채우지 않는다(멈춘 것과 오래 걸리는 것을 구분하는 일은 단계별 경과 시간이 맡는다).
 *   - 작업 이력 색인: 끝난 작업마다 단계별 소요 시간을 build/project-composer/history.json 에 남긴다. 최근 50건만 색인에 두며,
 *     색인에서 빠져도 작업 폴더·생성물은 지우지 않는다(삭제 API·자동 정리를 두지 않는다). 남은 시간은 같은 배치로 끝까지 마친
 *     최근 기록이 3건 이상일 때만 그 단계별 중앙값으로 말한다.
 * 이 컴퓨터 밖으로 나가지 않는 로컬 파일이며, 쓰기에 실패해도 생성 결과는 바꾸지 않는다.
 */
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { VERIFICATION_STEP_IDS, verificationSteps } from './verify-reusable-artifact.mjs';

export const JOB_STAGES = Object.freeze(['resolve', 'database', 'source', 'install', 'verify']);
export const TIMELINE_STATUSES = Object.freeze(['pending', 'running', 'passed', 'failed', 'skipped']);
/*
 * 진행률 가중치(%, 합 100). 이 컴퓨터에서 끝까지 마친 생성 7회의 단계 중앙값(구성 확인 수 초·DB 33초·소스 40초·설치 36초·
 * 검증 569초)과 검증 보고서 10건의 단계 중앙값(백엔드 약 6분·빌드 약 1분 40초·린트 약 1분)에서 정했다(2026-10-09).
 * 검증 단계의 몫(83)은 일곱 단계에 나눠 둔다.
 */
export const PROGRESS_WEIGHTS = Object.freeze({ resolve: 1, database: 5, source: 6, install: 5,
  governance: 2, 'ui-governance': 3, entrypoints: 1, backend: 49, typecheck: 6, lint: 9, build: 13 });
export const HISTORY_FILE = 'build/project-composer/history.json';
export const HISTORY_LIMIT = 50;
export const HISTORY_MIN_RUNS = 3;
const HISTORY_SAMPLE = 20;
const LAYOUTS = Object.freeze(['multi-module', 'single-module']);
const ITEMS = Object.freeze([...JOB_STAGES, ...VERIFICATION_STEP_IDS]);
const duration = value => Number.isSafeInteger(value) && value >= 0;

/** 검증기가 단계마다 찍는 머리줄 → 단계 id. 검증기(이관 제품이 복사하는 파일)는 바꾸지 않고 같은 단계 표에서 만든다. */
export function verificationStepMarkers({ profile, layout }) {
  return new Map(verificationSteps('full', layout)
    .map(step => [`[reusable-verify] ${profile}/${layout}: ${[step.command, ...step.args].join(' ')}`, step.id]));
}

export function createJobTimeline({ now = Date.now } = {}) {
  const startedAt = now();
  const items = new Map(ITEMS.map(id => [id, { status: 'pending' }]));
  let stage;
  let step;
  const open = id => { Object.assign(items.get(id), { status: 'running', startedAt: now() }); };
  const close = (id, status) => {
    const item = items.get(id);
    if (item?.status !== 'running') return;
    Object.assign(item, { status, durationMs: Math.max(0, now() - item.startedAt) });
  };
  return {
    /** 다음 단계로 넘어간다. 앞 단계(검증이면 그 안의 진행 중 단계도)는 통과다. */
    stage(next) {
      if (!JOB_STAGES.includes(next) || next === stage) return false;
      if (step) { close(step, 'passed'); step = undefined; }
      if (stage) close(stage, 'passed');
      stage = next; open(next);
      return true;
    },
    /** 검증 안에서 다음 단계로 넘어간다. 검증 중이 아니거나 같은 단계면 무시한다. */
    step(next) {
      if (stage !== 'verify' || !VERIFICATION_STEP_IDS.includes(next) || next === step || items.get(next).status !== 'pending') return false;
      if (step) close(step, 'passed');
      step = next; open(next);
      return true;
    },
    /** 검증기가 끝났다(통과). 진행 중인 검증 단계를 닫는다. 뒤따르는 보고서 확인·정리 실패를 마지막 검증 단계의 실패로 말하지 않는다. */
    endSteps() {
      if (step) { close(step, 'passed'); step = undefined; }
    },
    /**
     * 끝낸다. 통과면 진행 중인 것을 통과로 닫고, 검증이 통과했는데 머리줄을 못 본 단계는 통과(소요 시간 모름)다 — 전체 범위 검증이
     * 통과했다면 일곱 단계가 모두 돌았다. 검증 보고서의 단계별 소요 시간이 있으면 그 값을 쓴다(검증기가 잰 값이 정본이다).
     * 실패면 진행 중인 것을 실패로, 시작하지 않은 것을 건너뜀으로 닫는다.
     */
    finish(result, { verificationSteps: measured = [] } = {}) {
      if (result === 'passed') {
        if (step) close(step, 'passed');
        if (stage) close(stage, 'passed');
        if (items.get('verify').status === 'passed') {
          for (const id of VERIFICATION_STEP_IDS) {
            const item = items.get(id);
            const reported = measured.find(entry => entry?.step === id && entry.result === 'passed');
            if (item.status === 'pending') item.status = 'passed';
            if (duration(reported?.durationMs)) item.durationMs = reported.durationMs;
          }
        }
      } else {
        if (step) close(step, 'failed');
        if (stage) close(stage, 'failed');
      }
      for (const item of items.values()) if (item.status === 'pending' || item.status === 'running') item.status = 'skipped';
      stage = undefined; step = undefined;
    },
    snapshot() {
      const view = id => {
        const { status, startedAt: at, durationMs } = items.get(id);
        return { id, status, ...(status === 'running' ? { startedAt: at } : {}), ...(duration(durationMs) ? { durationMs } : {}) };
      };
      const passed = id => items.get(id).status === 'passed';
      const progress = ITEMS.filter(id => id !== 'verify' && passed(id)).reduce((sum, id) => sum + PROGRESS_WEIGHTS[id], 0);
      return { startedAt, stages: JOB_STAGES.map(view), steps: VERIFICATION_STEP_IDS.map(view), progress };
    },
  };
}

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validEntry = entry => plain(entry) && typeof entry.job === 'string' && /^[a-z0-9-]{1,90}$/.test(entry.job)
  && typeof entry.finishedAt === 'string' && Number.isFinite(Date.parse(entry.finishedAt)) && ['passed', 'failed'].includes(entry.result)
  && LAYOUTS.includes(entry.layout) && plain(entry.durations)
  && Object.entries(entry.durations).every(([id, value]) => ITEMS.includes(id) && duration(value));

/** 작업 이력 색인을 읽는다. 없거나 깨졌거나 모르는 형식이면 빈 이력이다(남은 시간을 말하지 않을 뿐이다). */
export function readJobHistory(outputRoot) {
  try {
    const value = JSON.parse(readFileSync(join(outputRoot, HISTORY_FILE), 'utf8'));
    return value?.schemaVersion === 1 && Array.isArray(value.entries) ? value.entries.filter(validEntry) : [];
  } catch { return []; }
}

/** 끝난 작업의 이력 항목. 소요 시간을 잰 단계만 싣는다. */
export function historyEntry({ job, layout, result, finishedAt = new Date().toISOString(), snapshot }) {
  const durations = {};
  for (const item of [...snapshot.stages, ...snapshot.steps]) if (duration(item.durationMs)) durations[item.id] = item.durationMs;
  return { job, finishedAt, result, layout, durations };
}

/**
 * 이력 색인에 한 건을 더한다. 같은 폴더의 임시 파일에 쓴 뒤 이름을 바꿔 반쯤 쓴 색인을 남기지 않는다.
 * 두 생성기(화면과 명령줄)가 같은 순간에 끝나면 한 건이 빠질 수 있다 — 색인은 남은 시간 추정용이라 받아들인다.
 */
export function appendJobHistory(outputRoot, entry) {
  if (!validEntry(entry)) throw new Error('Invalid job history entry');
  const path = join(outputRoot, HISTORY_FILE);
  const entries = [...readJobHistory(outputRoot), entry].slice(-HISTORY_LIMIT);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
    renameSync(temporary, path);
  } finally { rmSync(temporary, { force: true }); }
}

const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};
/**
 * 남은 시간. 같은 배치로 끝까지 마친 최근 기록(최대 20건)에서 남은 단계마다 측정값이 3개 이상이면 중앙값을 쓴다. 검증은 일곱 단계 값으로 센다.
 * 대기 중인 단계의 합(pendingMs)과 진행 중인 단계의 보통 시간(running)을 나눠 돌려준다 — 받는 쪽이 진행 중인 단계에서만 지난 시간을 빼고
 * 0 아래로 내리지 않게(한 단계가 늦어져도 뒤 단계의 몫을 깎지 않는다). remainingMs 는 now 시점의 같은 계산이다.
 * 측정값이 모자라면 remainingMs 는 null 이고, 남은 단계가 없으면(끝난 작업) 추정하지 않는다(undefined).
 */
export function estimateRemaining(history, { layout, snapshot, now = Date.now() }) {
  const items = [...snapshot.stages.filter(item => item.id !== 'verify'), ...snapshot.steps].filter(item => ['pending', 'running'].includes(item.status));
  if (!items.length) return undefined;
  const runs = history.filter(entry => entry.result === 'passed' && entry.layout === layout).slice(-HISTORY_SAMPLE);
  let pendingMs = 0;
  let running = null;
  for (const item of items) {
    const values = runs.map(entry => entry.durations[item.id]).filter(duration);
    if (values.length < HISTORY_MIN_RUNS) return { runs: runs.length, remainingMs: null };
    const typical = median(values);
    if (item.status === 'running') running = { id: item.id, typicalMs: typical, startedAt: item.startedAt };
    else pendingMs += typical;
  }
  const remainingMs = pendingMs + (running ? Math.max(0, running.typicalMs - Math.max(0, now - running.startedAt)) : 0);
  return { runs: runs.length, remainingMs, pendingMs, running: running && { id: running.id, typicalMs: running.typicalMs } };
}
