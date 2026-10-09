/*
 * 생성기를 다시 띄울 때, 끝나지 않았거나 정리를 마치지 못한 생성 작업의 자원을 정리한다(설계서 14.3, E6b).
 * 정리 대상은 이 컴퓨터의 같은 프로세스 공간에서 시작했고 그 프로세스가 이미 끝난 작업뿐이다(작업 보고서의 owner).
 * 컴퓨터 이름과 프로세스 번호만으로는 WSL·컨테이너처럼 이름을 나눠 쓰는 다른 프로세스 공간을 가리지 못하므로 플랫폼과
 * (Linux 면) PID 네임스페이스까지 같아야 한다. 소유를 확인할 수 없는 작업 — 소유 기록이 없거나, 다른 공간이거나,
 * 프로세스가 살아 있는 작업 — 은 건드리지 않는다. lease·주기적 자동 정리는 두지 않는다. 기동할 때 한 번만 본다.
 * 지우는 것은 그 작업의 표식이 붙은 임시 DB 컨테이너와, 프로젝트를 최종 위치로 옮기기 전이면 만들던 소스 폴더(.pending-*)와
 * DB 스키마 폴더뿐이다. 최종 위치의 프로젝트(와 그 DB 스키마 폴더)·작업 폴더는 남긴다.
 * 끝나지 않은 작업(started·verifying)과 취소한 작업은 둘 다, 실패한 작업은 임시 DB 만 본다(실패한 작업의 폴더는 진단용으로 남긴다).
 * 취소·실패 작업도 보는 이유는 정리 도중 생성기가 끝났을 수 있어서다(보고서에 결과는 남았지만 정리는 끝나지 않았다).
 */
import { existsSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import { removeOwnedPostgresByToken } from './project-composer-postgres.mjs';

const JOBS = 'build/project-composer/jobs';
const UNFINISHED = new Set(['started', 'verifying']);
const JOB_NAME = /^[a-z][a-z0-9-]{0,63}-([a-f0-9]{16})$/;

/** 이 프로세스의 소유자 표지. 생성 작업 보고서에 남기고, 기동 시 정리가 같은 공간의 작업인지 가린다. */
export function ownerIdentity() {
  let pidNamespace;
  if (process.platform === 'linux') {
    try { pidNamespace = readlinkSync('/proc/self/ns/pid'); } catch { /* 읽지 못하면 남기지 않는다. */ }
  }
  return { pid: process.pid, host: hostname(), platform: process.platform, ...(pidNamespace ? { pidNamespace } : {}) };
}

/** 이 보고서에서 정리할 것. 없으면 undefined. 지난 기동의 정리가 모두 끝났으면 다시 보지 않는다. */
function scopeOf(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return undefined;
  const recovery = report.recovery;
  if (recovery && recovery.database !== 'failed' && recovery.staging !== 'failed') return undefined;
  if (UNFINISHED.has(report.result) || report.result === 'cancelled') return { database: true, staging: true };
  if (report.result === 'failed') return { database: true, staging: false };
  return undefined;
}

/** 같은 프로세스 공간의 소유자인가. 플랫폼·컴퓨터 이름·PID 네임스페이스가 모두 같아야 한다. */
function sameSpace(owner, identity) {
  return Boolean(owner) && typeof owner === 'object' && owner.host === identity.host && owner.platform === identity.platform
    && (owner.pidNamespace ?? null) === (identity.pidNamespace ?? null) && Number.isSafeInteger(owner.pid) && owner.pid > 0;
}

/** 프로세스가 살아 있는지. 권한이 없어 신호를 보내지 못해도(EPERM) 살아 있다. 판단할 수 없으면 살아 있다고 본다(건드리지 않는 쪽). */
export function processAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code !== 'ESRCH'; }
}

/** 폴더를 지운다. 지운 뒤에도 남아 있으면(아직 쓰는 프로세스가 다시 만들었으면) 실패다. */
function removeFolder(path) {
  if (!existsSync(path)) return 'none';
  try { rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { return 'failed'; }
  return existsSync(path) ? 'failed' : 'removed';
}

/**
 * 정리한다. 작업 폴더 이름의 표식(16자리)으로 컨테이너를 찾고, 폴더 경로는 보고서 값이 아니라 작업 이름으로 다시 만든다
 * (보고서를 믿고 다른 폴더를 지우지 않는다). 정리에 실패하면 다음 기동에 다시 본다. Docker 가 한 번 실패하면 남은 작업의 DB 정리는
 * 시도하지 않고 실패로 남긴다(멈춘 Docker 를 작업마다 기다리지 않는다). 기동할 때만 부른다 — 이 프로세스는 아직 작업이 없으므로,
 * 보고서의 프로세스 번호가 이 프로세스와 같으면 같은 번호를 다시 받은 끝난 프로세스다.
 * 정리한 작업마다 { job, database, staging } 를 돌려준다(database·staging 은 removed·none·failed).
 */
export async function recoverAbandonedJobs({ outputRoot, docker, alive = processAlive, identity = ownerIdentity(), now = () => new Date().toISOString() }) {
  const base = resolve(outputRoot, JOBS);
  if (!existsSync(base)) return [];
  const recovered = [];
  let dockerDown = false;
  for (const name of readdirSync(base).sort()) {
    const token = JOB_NAME.exec(name)?.[1];
    if (!token) continue;
    const reportPath = join(base, name, 'report.json');
    let report;
    try { report = JSON.parse(readFileSync(reportPath, 'utf8')); } catch { continue; }
    const scope = scopeOf(report);
    if (!scope) continue;
    const owner = report.owner;
    if (!sameSpace(owner, identity) || (owner.pid !== identity.pid && alive(owner.pid))) continue;
    const cleaned = { database: 'none', staging: 'none' };
    if (scope.database) {
      if (dockerDown) cleaned.database = 'failed';
      else {
        try { if (await removeOwnedPostgresByToken(docker, token)) cleaned.database = 'removed'; }
        catch { cleaned.database = 'failed'; dockerDown = true; }
      }
    }
    if (scope.staging) {
      // 최종 위치로 옮긴 프로젝트가 있으면 그 DB 스키마 폴더는 프로젝트와 함께 남긴다.
      const kept = existsSync(resolve(outputRoot, 'build/reusable-base/source', name));
      const folders = [resolve(outputRoot, 'build/reusable-base/source', `.pending-${name}`),
        ...(kept ? [] : [resolve(outputRoot, 'build/reusable-base', `composer-${name}-db`)])];
      for (const result of folders.map(removeFolder)) {
        if (result === 'failed') cleaned.staging = 'failed';
        else if (result === 'removed' && cleaned.staging === 'none') cleaned.staging = 'removed';
      }
    }
    report.recovery = { ...cleaned, at: now() };
    // 끝나지 않은 작업만 '버려짐' 으로 끝낸다. 취소·실패 결과는 그대로 두고 정리 기록만 더한다.
    if (UNFINISHED.has(report.result) && cleaned.database !== 'failed' && cleaned.staging !== 'failed') report.result = 'abandoned';
    try { writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`); } catch { /* 보고서를 고치지 못하면 다음 기동에 다시 본다. */ }
    recovered.push({ job: name, ...cleaned });
  }
  return recovered;
}
