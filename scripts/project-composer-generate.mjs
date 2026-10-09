/*
 * 생성 작업(설계서 10·14장). 엔진(project-composer.mjs)이 원본 확인·계획·해석을 넘기고, 이 모듈이 DB 번들·소스 구성·의존성 설치·
 * 생성물 검증을 돌린다. 실패는 생긴 지점에서 작업 코드를 달고(E4b), 진행은 단계 타임라인으로 알린다(E6a).
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { ComposerError } from './project-composer-errors.mjs';
import { createLogMasker } from './project-composer-command.mjs';
import { createOwnedPostgres, ownedContainerId, removeOwnedPostgres, removeOwnedPostgresByToken, waitForOwnedPostgres } from './project-composer-postgres.mjs';
import { classifyChildFailure, classifyDatabaseNotReady, classifyDockerStart, classifyVerificationFailure, jobFailure, toRepositoryPath }
  from './project-composer-job-failure.mjs';
import { appendJobHistory, createJobTimeline, estimateRemaining, historyEntry, readJobHistory, verificationStepMarkers }
  from './project-composer-timeline.mjs';
import { ownerIdentity } from './project-composer-recovery.mjs';

const VERSION = 1;
export const PREFLIGHT_TIMEOUT_MS = 10_000;
// 임시 DB 정리 명령의 시간 제한. 정리는 취소 신호를 받지 않으므로, 멈춘 Docker 엔진이 작업을 '취소하는 중' 에 묶어 두지 않게 한다.
// 넘기면 정리 실패로 남기고 다음 기동의 정리가 다시 본다.
const CLEANUP_TIMEOUT_MS = 60_000;

export function composerOutputPaths(root, name, token) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(name) || !/^[a-f0-9]{16}$/.test(token)) throw new Error('Invalid output identity');
  const paths = {
    projectDirectory: resolve(root, 'build/reusable-base/source', `${name}-${token}`),
    stagingDirectory: resolve(root, 'build/reusable-base/source', `.pending-${name}-${token}`),
    databaseDirectory: resolve(root, 'build/reusable-base', `composer-${name}-${token}-db`),
    jobDirectory: resolve(root, 'build/project-composer/jobs', `${name}-${token}`),
  };
  const base = resolve(root, 'build');
  for (const path of Object.values(paths)) {
    const rel = relative(base, path);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Output must be fresh and inside the build directory');
    if (existsSync(path)) throw new ComposerError('OUTPUT_CONFLICT', { path: relative(root, path).split(sep).join('/') }, 'Output already exists');
    let ancestor = dirname(path);
    while (!existsSync(ancestor)) ancestor = dirname(ancestor);
    const physical = relative(realpathSync(root), realpathSync(ancestor));
    if (physical === '..' || physical.startsWith(`..${sep}`) || isAbsolute(physical)) throw new Error('Output ancestor escapes the workspace');
  }
  return paths;
}

/** 생성 함수를 만든다. 한 엔진에서 생성 작업은 한 번에 하나다. */
export function createGenerator({ root, outputRoot, run, fingerprint, gitRun, plan, resolveRecipe, loadCatalogClassified, readiness }) {
  let running = false;
  /**
   * `signal`(AbortSignal)로 취소한다(E6b). 진행 중인 자식 프로세스 트리를 끝내고, 그 뒤의 실패는 모두 취소의 결과로 본다.
   * 임시 DB 는 취소 신호 없이 끝까지 정리하고, 만들던 소스 폴더(.pending-*)는 지운다. 이미 최종 위치로 옮긴 프로젝트는
   * 검증되지 않았다는 보고서와 함께 남긴다(삭제 API·자동 정리를 두지 않는다). 무엇을 정리했는지는 취소 오류의 details 다.
   */
  const generate = async (recipe, { onProgress = () => {}, signal } = {}) => {
    if (running) throw new Error('A composition job is already running');
    running = true;
    let container;
    let databaseCreated = false;
    let failed = false;
    let report;
    let paths;
    let token;
    let stage = 'resolve';
    let composition;
    let sourceFingerprint;
    // 진행 타임라인(설계서 14.3, E6a). 단계·검증 단계가 바뀔 때마다 상태·소요 시간과 남은 시간 추정을 알린다.
    // 남은 시간은 이 작업을 시작할 때의 작업 이력으로만 센다. 화면 알림이 실패해도 생성은 계속한다.
    const timeline = createJobTimeline();
    const history = readJobHistory(outputRoot);
    const emit = () => {
      const snapshot = timeline.snapshot();
      try { onProgress({ stage, progress: snapshot.progress, timeline: snapshot, estimate: estimateRemaining(history, { layout: recipe?.backendLayout, snapshot }) }); }
      catch { /* 알림을 받는 쪽의 오류가 생성 결과를 바꾸지 않는다. */ }
    };
    const cancelled = () => Boolean(signal?.aborted);
    const cancellation = cause => Object.assign(new ComposerError('CANCELLED', {}, 'Generation was cancelled'), cause ? { cause } : {});
    const progress = next => { if (cancelled()) throw cancellation(); stage = next; timeline.stage(next); emit(); };
    // 작업 명령은 취소 신호를 받는다. 정리 명령(cleanupDocker)은 받지 않는다 — 취소한 뒤에도 끝까지 정리한다.
    const jobRun = (command, args, options = {}) => run(command, args, { ...options, ...(signal ? { signal } : {}) });
    const timelineReport = snapshot => ({ stages: snapshot.stages, steps: snapshot.steps });
    // 끝난 작업을 이력 색인에 남긴다. 색인은 남은 시간 추정용이라 쓰지 못해도 생성 결과는 그대로다(작업 보고서에도 같은 값이 있다).
    const recordHistory = (result, snapshot) => {
      if (!paths || !composition) return;
      try { appendJobHistory(outputRoot, historyEntry({ job: basename(paths.jobDirectory), layout: composition.backendLayout, result, snapshot })); }
      catch { /* 다음 작업의 남은 시간 추정에서 이 작업이 빠질 뿐이다. */ }
    };
    let outcome;
    let thrown;
    let verified = false;
    /**
     * 취소한 뒤 무엇을 정리했는지 남긴다. 최종 위치로 옮기기 전이면 만들던 소스 폴더와 DB 스키마 폴더를 지우고(지운 뒤 다시 생겼으면
     * 실패), 옮긴 뒤면 프로젝트와 그 DB 스키마 폴더를 남겨 위치를 알린다. 보고서를 쓰지 못해도 취소는 취소로 끝난다.
     */
    const recordCancellation = (error, { hadDatabase, databaseCleaned }) => {
      const kept = Boolean(paths && existsSync(paths.projectDirectory));
      let staging = 'none';
      for (const path of paths ? [paths.stagingDirectory, ...(kept ? [] : [paths.databaseDirectory])] : []) {
        if (!existsSync(path)) continue;
        try { rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { staging = 'failed'; continue; }
        if (existsSync(path)) staging = 'failed';
        else if (staging === 'none') staging = 'removed';
      }
      const project = kept ? { project: toRepositoryPath(outputRoot, paths.projectDirectory),
        ...(existsSync(paths.databaseDirectory) ? { schema: toRepositoryPath(outputRoot, paths.databaseDirectory) } : {}) } : {};
      const details = { database: hadDatabase ? (databaseCleaned ? 'removed' : 'failed') : 'none', staging, ...project };
      error.details = details;
      if (report) { report.cancellation = details; saveQuietly(); }
    };
    const save = () => {
      if (paths && report) writeFileSync(join(paths.jobDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    };
    // 실패·취소 경로의 보고서 쓰기. 쓰지 못해도(잠금·공간 부족) 원래 실패·취소를 가리지 않는다. 다음 기동의 정리는 'started'·
    // 'cancelled'·'failed' 보고서를 모두 보므로, 남은 자원은 그때 다시 정리된다.
    const saveQuietly = () => { try { save(); } catch { /* 위 설명대로 원래 결과를 지킨다. */ } };
    const docker = (args, options = {}) => jobRun('docker', args, { root, capture: true, ...options });
    const cleanupDocker = (args, options = {}) => run('docker', args, { root, capture: true, timeoutMs: CLEANUP_TIMEOUT_MS, ...options });
    // 단계마다 자식 출력의 가린 사본을 jobs/<id>/logs/<단계>.log 에 남긴다. 이 컴퓨터 밖으로 보내지 않는다.
    const logOf = name => join(paths.jobDirectory, 'logs', `${name}.log`);
    // 시작에 실패해 ID 를 받지 못한 컨테이너는 이 작업의 표식으로 찾아 지운다.
    const cleanupDatabase = async () => {
      if (!databaseCreated) return;
      if (ownedContainerId(container)) await removeOwnedPostgres(cleanupDocker, container, token);
      else await removeOwnedPostgresByToken(cleanupDocker, token);
      container = undefined; databaseCreated = false;
    };
    // 실패 분류용 Docker 탐침. 멈춘 엔진을 기다리지 않도록 시간 제한을 두고, 탐침도 DB 단계 로그에 남긴다.
    const probeOptions = () => ({ timeoutMs: PREFLIGHT_TIMEOUT_MS, log: logOf('database') });
    // 자식이 실패한 뒤 원본을 다시 본다. 판정하지 못하면(git 실패 등) 바뀌었다고 말하지 않는다.
    const sourceMoved = () => {
      try { return gitRun(['rev-parse', 'HEAD']) !== composition.sourceCommit || fingerprint(root) !== sourceFingerprint; }
      catch { return false; }
    };
    // 자식 생성기는 실패 원인을 코드로 jobs/<id>/failures/<단계>.json 에 보고한다(코드가 붙은 실패만).
    const childStage = async (name, args) => {
      const reportPath = join(paths.jobDirectory, 'failures', `${name}.json`);
      try { await jobRun('node', [...args, '--failure-report', reportPath], { root, log: logOf(name) }); }
      catch (error) {
        // 취소로 끝낸 자식은 분류하지 않는다(Docker 탐침이 정리를 늦추고, 취소를 다른 실패로 말하지 않게).
        if (cancelled()) throw cancellation(error);
        throw await classifyChildFailure(error, { stage: name, reportPath, root, sourceMoved,
          ...(name === 'database' ? { docker, container, probeOptions: probeOptions() } : {}) });
      }
    };
    try {
      progress('resolve');
      const resolvedPlan = plan(recipe);
      // 생성 불가 구성은 출력 폴더·DB 컨테이너를 만들기 전에 사유와 함께 거부한다.
      if (resolvedPlan.blockers.length) throw Object.assign(new Error(resolvedPlan.blockers.join(' ')), { code: 'FK_CLOSURE' });
      composition = { ...resolveRecipe(recipe, loadCatalogClassified()), sourceCommit: resolvedPlan.sourceCommit };
      sourceFingerprint = fingerprint(root);
      token = randomBytes(8).toString('hex');
      paths = composerOutputPaths(outputRoot, composition.project.name, token);
      mkdirSync(paths.jobDirectory, { recursive: true });
      const compositionPath = join(paths.jobDirectory, 'composition.json');
      writeFileSync(compositionPath, `${JSON.stringify(composition, null, 2)}\n`);
      report = { schemaVersion: VERSION, generatorVersion: VERSION, result: 'started', stage,
        compositionHash: composition.compositionHash, sourceCommit: composition.sourceCommit, sourceFingerprint,
        localDevelopmentBuild: Boolean(gitRun(['status', '--porcelain'])) || !gitRun(['tag', '--points-at', 'HEAD']).split(/\r?\n/).some(tag => /^v\d/.test(tag)),
        startedAt: new Date().toISOString(), environmentApproved: false, ...paths,
        // 서버를 다시 띄울 때 끝나지 않은 작업의 자원을 정리할지 판단하는 근거(이 컴퓨터의 이 프로세스가 끝났는가).
        owner: ownerIdentity() };
      save();
      progress('database');
      databaseCreated = true;
      try { container = await createOwnedPostgres(docker, { name: `egov-composer-${token}`, token, log: logOf('database') }); }
      catch (error) { throw cancelled() ? cancellation(error) : await classifyDockerStart(error, docker, probeOptions()); }
      if (!ownedContainerId(container)) throw new Error('Invalid owned database container identity');
      if (!await waitForOwnedPostgres(docker, container, { ...(readiness ?? {}), ...(signal ? { signal } : {}) })) {
        if (cancelled()) throw cancellation();
        throw await classifyDatabaseNotReady(docker, probeOptions());
      }
      const common = ['--composition', compositionPath, '--allow-dirty', '--allow-non-release-ref'];
      await childStage('database', ['scripts/generate-reusable-base-db.mjs', ...common, '--container', container, '--output', paths.databaseDirectory]);
      progress('source');
      await childStage('source', ['scripts/generate-reusable-base-source.mjs', ...common, '--db-bundle', paths.databaseDirectory, '--output', paths.stagingDirectory]);
      if (fingerprint(root) !== sourceFingerprint) throw new ComposerError('SOURCE_CHANGED', {}, 'Source checkout changed while the project was being composed');
      writeFileSync(join(paths.stagingDirectory, 'project-recipe.json'), `${JSON.stringify(composition.recipe, null, 2)}\n`);
      writeFileSync(join(paths.stagingDirectory, 'project-composition.json'), `${JSON.stringify(composition, null, 2)}\n`);
      // pnpm uses absolute junctions on Windows. Set the permanent source location
      // before dependency installation, and publish readiness only through the final report.
      if (existsSync(paths.projectDirectory)) {
        throw new ComposerError('OUTPUT_CONFLICT', { path: toRepositoryPath(outputRoot, paths.projectDirectory) }, 'Final output unexpectedly exists');
      }
      renameSync(paths.stagingDirectory, paths.projectDirectory);
      report.result = 'verifying';
      writeFileSync(join(paths.projectDirectory, 'project-generation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
      progress('install');
      await jobRun('npm', ['ci', '--ignore-scripts'], { root: paths.projectDirectory, log: logOf('install') });
      await jobRun('pnpm', ['-C', 'frontend', 'install', '--frozen-lockfile'], { root: paths.projectDirectory, log: logOf('install') });
      progress('verify');
      // 검증기가 단계마다 찍는 머리줄로 검증 일곱 단계 중 어디인지 알린다(검증기 자체는 바꾸지 않는다).
      const markers = verificationStepMarkers({ profile: composition.profile, layout: composition.backendLayout });
      const onLine = line => { const step = markers.get(line); if (step && timeline.step(step)) emit(); };
      try { await jobRun('node', ['scripts/verify-reusable-artifact.mjs'], { root: paths.projectDirectory, log: logOf('verify'), onLine }); }
      catch (error) {
        throw classifyVerificationFailure(error, { projectDirectory: paths.projectDirectory, composition, startedAt: report.startedAt,
          roots: [paths.projectDirectory, outputRoot, root] });
      }
      // 검증기가 통과했으면 검증 단계는 모두 끝났다. 뒤따르는 보고서 확인·DB 정리 실패는 검증 단계가 아니라 검증 단계 묶음의 실패다.
      timeline.endSteps();
      const verification = JSON.parse(readFileSync(join(paths.projectDirectory, 'build/reports/reusable-base/full.json'), 'utf8'));
      if (verification.result !== 'passed' || verification.sourceCommit !== composition.sourceCommit
        || verification.layout !== composition.backendLayout || verification.profile !== composition.profile
        || verification.scope !== 'full') throw new Error('Generated project verification report is incomplete');
      // 검증을 마친 뒤에 온 취소는 결과를 바꾸지 않는다(검증된 프로젝트를 '검증하지 않음' 으로 남기지 않는다).
      verified = true;
      await cleanupDatabase();
      timeline.finish('passed', { verificationSteps: Array.isArray(verification.steps) ? verification.steps : [] });
      const finished = timeline.snapshot();
      report = { ...report, result: 'passed', stage: 'complete', finishedAt: new Date().toISOString(), verification, timeline: timelineReport(finished) };
      delete report.stagingDirectory;
      save();
      writeFileSync(join(paths.projectDirectory, 'project-generation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
      recordHistory('passed', finished);
      stage = 'complete'; emit();
      return { projectDirectory: paths.projectDirectory, databaseDirectory: paths.databaseDirectory,
        reportPath: join(paths.projectDirectory, 'project-generation-report.json'), recipe: composition.recipe, verified: true };
    } catch (raised) {
      failed = true;
      // 취소된 뒤의 실패(끝낸 자식의 종료 등)는 취소의 결과다. 취소로 말한다.
      outcome = cancelled() && !verified ? 'cancelled' : 'failed';
      const error = outcome === 'cancelled' && !(raised instanceof ComposerError && raised.code === 'CANCELLED') ? cancellation(raised) : raised;
      timeline.finish(outcome);
      const finished = timeline.snapshot();
      // 화면으로는 단계·코드·명령 식별자·종료 코드·저장소 기준 로그 위치만 넘긴다. 자식 출력 원문은 로그 파일에만 있고,
      // 검증 실패만 가린 로그 끝부분을 던지는 실패에 붙인다(보고서에는 저장하지 않는다 — CI 아티팩트로 올라간다).
      const failure = jobFailure(error, { stage, outputRoot, sourceCommit: composition?.sourceCommit });
      if (report) {
        report.result = outcome; report.stage = stage; report.finishedAt = new Date().toISOString(); report.timeline = timelineReport(finished);
        const verificationReport = join(paths.projectDirectory, 'build/reports/reusable-base/full.json');
        const { logTail, ...saved } = failure;
        report.failure = { ...saved, message: createLogMasker().line(String(error.message)).slice(0, 2000),
          ...(existsSync(verificationReport) ? { verificationReport: toRepositoryPath(outputRoot, verificationReport) } : {}) };
        saveQuietly();
        failure.report = toRepositoryPath(outputRoot, join(paths.jobDirectory, 'report.json'));
        if (existsSync(paths.projectDirectory)) {
          try { writeFileSync(join(paths.projectDirectory, 'project-generation-report.json'), `${JSON.stringify(report, null, 2)}\n`); }
          catch { /* 작업 보고서가 같은 결과를 남긴다. */ }
        }
      }
      recordHistory(outcome, finished);
      // 실패한 단계·검증 단계와 건너뛴 단계를 마지막으로 알린다(실패 문장은 던지는 실패가 말한다).
      emit();
      thrown = Object.assign(error, { failure });
      throw thrown;
    } finally {
      // 정리 실패가 원래 실패(단계·명령·로그)를 가리지 않게 한다. 원래 실패가 있으면 정리 실패는 보고서에만 남긴다.
      const hadDatabase = databaseCreated;
      let databaseCleaned = hadDatabase;
      try { await cleanupDatabase(); }
      catch (cleanupError) {
        databaseCleaned = false;
        if (!failed) { running = false; throw cleanupError; }
        if (report) { report.cleanupFailure = createLogMasker().line(String(cleanupError.message)).slice(0, 500); saveQuietly(); }
      }
      try { if (outcome === 'cancelled' && thrown) recordCancellation(thrown, { hadDatabase, databaseCleaned }); }
      finally { running = false; }
    }
  };
  return generate;
}
