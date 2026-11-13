// Item store engine (ADR-0055): incremental analysis of registered documents
// into requirements, deliverable items, and stories. State lives in the
// workspace; the model is a stateless worker called with bounded requests, and
// every finished request is committed at once, so stopping loses one request.
import { mkdirSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { assertExternalWorkspace } from './store.mjs';
import { AI_MODEL, aiEffortForPhase, createCliRunner, findClaudeExecutable } from './ai-cli.mjs';
import { collectSensitivityWarnings } from './privacy-warnings.mjs';
import { ARTIFACT_IDS, ARTIFACT_TYPES, DERIVED_DOCUMENTS, REQUIREMENT_CATEGORIES, REQUIREMENT_FIELDS, REQUIREMENT_KIND, fieldConflicts, fieldLabels, isFilled, isKind, mergeFieldsAdditive } from './studio-catalog.mjs';
import { createIndex, similarity } from './studio-index.mjs';
import { DEVELOPMENT_CATEGORIES, QUALITY_CATEGORIES, addCandidate, applyStories, applyTag, baselineContent, clauseKey, clauseMap, createRelations, crossChecks, decideProposal, demoteProgramConflicts, failTag, initialStudio, itemById, itemReady, itemScore, label, markExtracted, meaningHash, missingFields, neighborIndex, orphanStories, pendingWork, planTargets, raiseQuestions, recordBaseline, removeOrphanStories, resolveIssue, saveItem, searchParts, setItemStatus, settleCandidate, startJob, variantCurrent } from './studio-model.mjs';
import { describeEvidence, documentList, renderDocument } from './studio-render.mjs';
import { CLAUSE_BATCH, MERGE_BATCH, PLAN_BATCH, REQUEST_LIMIT, STUDIO_PROMPT_VERSION, batchClauses, classifyRequest, enrichRequest, extractRequest, fitted, mergeRequest, planRequest, readClassify, readEnrich, readExtract, readMerge, readPlan, studioPrompts } from './studio-tasks.mjs';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (value, keys) => { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('INVALID_REQUEST'); };
const CONSENT = ['consent', 'model', 'sensitivityAcknowledged'];
// Failures of the CLI itself stop a run; a reply that cannot be used only costs that one request.
// A state the store refuses to save is a defect in this tool, so it stops the run as well instead of being counted away.
const FATAL = /^(AI_CLI_UNAVAILABLE|AI_CLI_FAILED|AI_MODEL_MISMATCH|AI_TIMEOUT|AI_CONFIGURATION_INVALID|STUDIO_CAPACITY|STUDIO_ISSUE_CAPACITY|STUDIO_CALL_CAPACITY|STUDIO_STATE_INVALID|INVALID_METADATA|INVALID_REQUEST|BACKLOG_INVALID|REQUIREMENTS_[A-Z_]+|WORKSPACE_REVISION_CONFLICT)$/;
const STAGES = { classify: '조각 분류와 요구사항 후보 추출', extract: '켜 둔 산출물의 항목 추출', settle: '기존 요구사항·항목과 대조' };
const errorCode = error => /^[A-Z][A-Z0-9_]{2,80}$/.test(error?.code ?? '') ? error.code : 'STUDIO_RUN_FAILED';

async function pool(tasks, width, run) {
  let next = 0;
  const worker = async () => { while (next < tasks.length) await run(tasks[next++]); };
  await Promise.all(Array.from({ length: Math.min(width, tasks.length) }, worker));
}

export function createStudio({ store, commit, runner = createCliRunner(), now = () => new Date().toISOString(), blocked = () => null, concurrency = 2, maxCalls = 600 }) {
  let active, closed = false, available = false, advisories = { revision: null, list: [] };
  const snapshotStudio = snapshot => snapshot.metadata.studio ?? initialStudio();
  /** Every change is one checked commit against the latest revision; a throwing mutation commits nothing. */
  function update(mutate) {
    let result;
    commit(store.read().revision, next => { next.metadata.studio ??= initialStudio(); result = mutate(next.metadata.studio, next); });
    return result;
  }
  const current = () => { const snapshot = store.read(); return { studio: snapshotStudio(snapshot), backlog: snapshot.backlog }; };

  function requireConsent(payload) {
    if (payload.consent !== true || payload.model !== AI_MODEL) fail('AI_CONSENT_REQUIRED');
    if (payload.sensitivityAcknowledged !== true) fail('FILE_REDACTION_REQUIRED');
  }
  function begin(kind, body, target) {
    if (closed) fail('STUDIO_CLOSED');
    if (active) fail('AI_BUSY');
    const reason = blocked();
    if (reason) fail(reason);
    const job = update(studio => structuredClone(startJob(studio, { kind, now: now(), target, promptVersion: STUDIO_PROMPT_VERSION })));
    const controller = new AbortController(), operation = { id: job.id, controller };
    active = operation;
    const context = { id: job.id, signal: controller.signal, calls: 0, pending: { calls: 0, requestBytes: 0, maxRequestBytes: 0, outputBytes: 0, inputTokens: 0, outputTokens: 0 } };
    // Records progress of the running job together with the data it produced, in one commit.
    context.step = mutate => update((studio, next) => {
      const record = studio.jobs.find(entry => entry.id === job.id);
      if (!record || record.status !== 'running') fail('AI_CANCELLED');
      for (const [key, value] of Object.entries(context.pending)) { record[key] = key === 'maxRequestBytes' ? Math.max(record[key], value) : record[key] + value; context.pending[key] = 0; }
      return mutate(studio, record, next);
    });
    const finish = (status, errorCode) => {
      try { update(studio => { const record = studio.jobs.find(entry => entry.id === job.id); if (record?.status === 'running') Object.assign(record, { status, completedAt: now(), ...(errorCode ? { errorCode } : {}) }); }); }
      catch { /* The workspace changed hands or became read-only; its own guard already reports that. */ }
    };
    operation.promise = Promise.resolve().then(async () => {
      const scratch = assertExternalWorkspace(join(store.directory, '.scratch'));
      mkdirSync(scratch, { recursive: true, mode: 0o700 });
      context.cwd = mkdtempSync(join(scratch, 'studio-'));
      try { await body(context); context.step(() => {}); finish('done'); }
      catch (error) {
        const cancelled = controller.signal.aborted || error.code === 'AI_CANCELLED';
        finish(cancelled ? 'cancelled' : 'failed', cancelled ? undefined : errorCode(error));
        // Requests still in flight belong to a run that has ended; their replies could no longer be saved.
        controller.abort();
      } finally {
        // A request that is still winding down can hold the folder. An empty folder left behind is harmless,
        // and a cleanup error must never replace the reason the run ended.
        try { assertExternalWorkspace(context.cwd); await rm(context.cwd, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }); } catch { /* left behind */ }
      }
    }).catch(error => finish('failed', errorCode(error))).finally(() => { if (active === operation) active = undefined; });
  }
  async function call(context, built) {
    if (context.signal.aborted) fail('AI_CANCELLED');
    if (++context.calls > maxCalls) fail('STUDIO_CALL_CAPACITY');
    const response = await runner({ request: built.request, schema: built.schema, cwd: context.cwd, signal: context.signal, attachments: [] });
    if (response?.model !== AI_MODEL || response.effort !== aiEffortForPhase(built.request.phase)) fail('AI_MODEL_MISMATCH');
    const pending = context.pending;
    pending.calls += 1; pending.requestBytes += built.bytes; pending.maxRequestBytes = Math.max(pending.maxRequestBytes, built.bytes);
    pending.outputBytes += Buffer.byteLength(JSON.stringify(response.output ?? null));
    pending.inputTokens += Number.isSafeInteger(response.usage?.inputTokens) ? response.usage.inputTokens : 0;
    pending.outputTokens += Number.isSafeInteger(response.usage?.outputTokens) ? response.usage.outputTokens : 0;
    return response.output;
  }
  /** Runs one request-and-commit unit. A unit that fails for a non-fatal reason is counted and skipped; its input stays pending for the next run. */
  async function unit(context, run, onFailure = () => {}) {
    try { await run(); context.streak = 0; }
    catch (error) {
      if (stops(context, error)) throw error;
      context.step((studio, job) => { onFailure(studio); job.failures += 1; job.done += 1; });
    }
  }
  /** Whether an error ends the run. Three unusable replies in a row end it too: the cause is then not one odd document. */
  function stops(context, error) {
    if (context.signal.aborted || error.code === 'AI_CANCELLED' || FATAL.test(error.code ?? '')) return true;
    context.streak = (context.streak ?? 0) + 1;
    if (context.streak < 3) return false;
    error.code = 'STUDIO_REPEATED_FAILURE';
    return true;
  }
  const stage = (context, name, total, done = 0) => context.step((studio, job) => { job.stage = name; job.done = done; job.total = total; });
  const tally = (job, key, amount = 1) => { job.summary[key] = (job.summary[key] ?? 0) + amount; };
  /**
   * Runs the request units of one stage a few at a time and compares the
   * candidates they produced before going on. Items therefore appear while
   * the documents are still being read, and the candidates that wait never
   * come near the store's limit however many documents there are.
   */
  async function sliced(context, name, tasks, run) {
    const width = concurrency * 2;
    stage(context, name, tasks.length);
    for (let start = 0; start < tasks.length; start += width) {
      await pool(tasks.slice(start, start + width), concurrency, run);
      const { studio } = current();
      if (!studio.candidates.length) continue;
      const done = studio.jobs.find(job => job.id === context.id)?.done ?? 0;
      await settle(context);
      if (start + width < tasks.length) stage(context, name, tasks.length, done);
    }
  }

  async function analyze(context) {
    // "New" and "added to" describe the latest analysis. They are cleared when a new one starts, unless it continues a run that did not finish.
    const earlier = current().studio.jobs.filter(job => job.kind === 'analyze' && job.id !== context.id).at(-1);
    if (!earlier || earlier.status === 'done') context.step(studio => { for (const item of studio.items) item.flags = {}; });
    // Differences the program raised were once stored as conflicts; they stop blocking confirmation here.
    context.step((studio, job) => { const demoted = demoteProgramConflicts(studio); if (demoted) tally(job, 'demoted', demoted); });
    // Candidates an earlier run left behind are finished reading that only waits to be compared; they come first.
    if (current().studio.candidates.length) await settle(context);
    const first = pendingWork(current().studio, current().backlog), grouped = batchClauses(first.classify);
    if (grouped.oversize.length) context.step((studio, job) => { for (const clause of grouped.oversize) { failTag(studio, clause); failTag(studio, clause); } job.failures += grouped.oversize.length; tally(job, 'oversize', grouped.oversize.length); });
    await sliced(context, STAGES.classify, grouped.batches, batch => unit(context, async () => {
      const result = readClassify(await call(context, classifyRequest(batch)), batch);
      context.step((studio, job) => {
        for (const tag of result.tags) applyTag(studio, tag.clause, tag);
        for (const clause of result.missing) failTag(studio, clause);
        for (const candidate of result.candidates) addCandidate(studio, candidate);
        job.failures += result.missing.length + result.dropped; job.done += 1; tally(job, 'clauses', result.tags.length);
      });
    }, studio => { for (const clause of batch) failTag(studio, clause); }));
    const second = pendingWork(current().studio, current().backlog), tasks = [];
    for (const type of current().studio.enabled) {
      const batches = batchClauses(second.extract[type] ?? []);
      for (const batch of batches.batches) tasks.push({ type, batch });
      if (batches.oversize.length) context.step(studio => markExtracted(studio, batches.oversize, type));
    }
    await sliced(context, STAGES.extract, tasks, task => unit(context, async () => {
      const request = extractRequest(task.type, task.batch);
      let result = readExtract(await call(context, request), task.type, task.batch);
      // A reply with unusable items is asked for once more. What is still unusable is counted; a reply with no item list
      // leaves the clauses pending for the next run instead of marking them done.
      if (result.invalid || result.dropped) result = readExtract(await call(context, request), task.type, task.batch);
      if (result.invalid) fail('STUDIO_REPLY_UNUSABLE');
      context.step((studio, job) => { markExtracted(studio, task.batch, task.type); for (const item of result.items) addCandidate(studio, item); job.failures += result.dropped; job.done += 1; });
    }));
    await settle(context);
  }
  /**
   * Compares candidates with existing items a few at a time. A candidate with no
   * similar item is added without a model call. A deliverable item named like an
   * existing one is taken as the same item without asking only when it adds and
   * contradicts nothing; otherwise the model compares them. Candidates that
   * resemble another candidate of the same round wait, so the earlier one is an
   * item by then. A judgement is applied only if its target is still the record
   * that was compared; if a person changed it meanwhile, or another candidate
   * of the same round was merged into it first, the candidate is compared again.
   * A round sends as many comparison requests at once as the run may have open.
   */
  async function settle(context) {
    stage(context, STAGES.settle, current().studio.candidates.length);
    for (;;) {
      const { studio } = current();
      if (!studio.candidates.length) return;
      if (context.signal.aborted) fail('AI_CANCELLED');
      const kind = studio.candidates[0].kind, search = neighborIndex(studio, kind), direct = [], groups = [[]], taken = [];
      for (const candidate of studio.candidates.filter(entry => entry.kind === kind).slice(0, 80)) {
        // Names carry identity; similar names in one round would be judged without seeing each other.
        if (taken.some(name => similarity([[name, 1]], [[candidate.name, 1]]) >= 0.5)) continue;
        const near = search(candidate.name, candidate.fields);
        const twin = kind === REQUIREMENT_KIND ? null : near.find(hit => label(hit.item.name) === label(candidate.name));
        const silent = twin && !mergeFieldsAdditive(kind, twin.item.fields, candidate.fields).changed.length && !fieldConflicts(kind, twin.item.fields, candidate.fields).length;
        if (!near.length) direct.push({ candidate, decision: { action: 'new' } });
        else if (silent) direct.push({ candidate, decision: { action: 'same', target: twin.item.id }, rev: twin.item.rev });
        else {
          if (groups.at(-1).length >= MERGE_BATCH) { if (groups.length >= concurrency) continue; groups.push([]); }
          groups.at(-1).push({ candidate, near });
        }
        taken.push(candidate.name);
      }
      const decided = [...direct];
      let failures = 0;
      await Promise.all(groups.filter(group => group.length).map(async compare => {
        try {
          const built = fitted(entries => mergeRequest(kind, entries), compare), entries = compare.slice(0, built.used);
          const decisions = readMerge(await call(context, built), entries, built.partial);
          decided.push(...entries.map((entry, index) => ({ candidate: entry.candidate, decision: decisions[index], rev: entry.near.find(hit => hit.item.id === decisions[index].target)?.item.rev })));
          context.streak = 0;
        } catch (error) {
          if (stops(context, error)) throw error;
          // The comparison could not be made; the candidate becomes a visible draft rather than being merged on a guess.
          decided.push({ candidate: compare[0].candidate, decision: { action: 'new' } });
          failures += 1;
        }
      }));
      context.step((draft, job) => {
        job.failures += failures;
        for (const { candidate, decision, rev } of decided) {
          if (!draft.candidates.some(entry => entry.id === candidate.id)) continue;
          // The target is no longer the record that was compared (a person edited it, or an earlier candidate of this
          // commit was merged into it): the judgement is stale, so the candidate stays and is compared again.
          if (decision.target && itemById(draft, decision.target)?.rev !== rev) continue;
          const result = settleCandidate(draft, candidate.id, decision, now());
          tally(job, result.outcome); if (result.conflicts) tally(job, 'conflict', result.conflicts); if (result.variants) tally(job, 'variant', result.variants); job.done += 1;
        }
      });
    }
  }
  /** Clauses to read for one item: its own evidence first, then clauses tagged for its kind that resemble it. */
  function enrichClauses(studio, backlog, item) {
    const clauses = clauseMap(backlog), own = item.evidence.map(entry => clauses.get(clauseKey(entry.s, entry.c))).filter(Boolean);
    const taken = new Set(own.map(clause => clause.key));
    const tagged = [...clauses.values()].filter(clause => { const tag = studio.tags[clause.key]; return !taken.has(clause.key) && tag && tag.h === clause.hash && (item.kind === REQUIREMENT_KIND ? tag.r === 1 : tag.a.includes(item.kind)); });
    const ranked = createIndex(tagged.map(clause => ({ id: clause.key, parts: [[clause.text, 1]] }))).search(searchParts(item.kind, item.name, item.fields), 16, 0.05).map(hit => clauses.get(hit.id));
    const batch = []; let size = 0;
    for (const clause of [...own, ...ranked]) {
      const weight = Buffer.byteLength(clause.text) + Buffer.byteLength(clause.locator) + 24;
      if (batch.length >= CLAUSE_BATCH.count || size + weight > CLAUSE_BATCH.bytes - 4096) break;
      batch.push(clause); size += weight;
    }
    return batch;
  }
  async function enrich(context, itemId) {
    const { studio, backlog } = current(), item = itemById(studio, itemId);
    const batch = enrichClauses(studio, backlog, item);
    stage(context, '빈칸 보강', 1);
    if (!batch.length) { context.step((draft, job) => { job.done = 1; tally(job, 'nothing'); }); return; }
    const result = readEnrich(await call(context, enrichRequest(item, batch)), item, batch);
    context.step((draft, job) => {
      const target = itemById(draft, itemId);
      if (!target || target.status !== 'draft' || target.rev !== item.rev) fail('STUDIO_ITEM_CONFLICT');
      const before = JSON.stringify(target.fields);
      // The reply only offers empty fields, so this fills gaps and replaces nothing.
      for (const [key, value] of Object.entries(result.fields)) if (isFilled(value) && !isFilled(target.fields[key])) target.fields[key] = value;
      if (JSON.stringify(target.fields) !== before) {
        const seen = new Set(target.evidence.map(entry => clauseKey(entry.s, entry.c)));
        for (const entry of result.evidence) if (!seen.has(clauseKey(entry.s, entry.c)) && target.evidence.length < 40) target.evidence.push(entry);
        target.flags.enriched = 1; target.rev += 1; tally(job, 'enriched');
      } else tally(job, 'nothing');
      if (result.question && missingFields(target).length && raiseQuestions(draft, target, [result.question], [], now())) tally(job, 'questions');
      if (result.overflow.length) raiseQuestions(draft, target, [`보강한 ‘${fieldLabels(target.kind, result.overflow)}’의 내용이 길이 한도를 넘어 일부만 담겼습니다. 근거 조각과 대조해 주세요.`], result.evidence, now());
      job.done = 1;
    });
  }
  async function plan(context) {
    let remaining = planTargets(current().studio).map(item => item.id);
    stage(context, '스토리와 인수조건 작성', remaining.length);
    // Stories of requirements that were excluded or returned to draft no longer describe confirmed scope.
    context.step((draft, job) => { const removed = removeOrphanStories(draft, now()); if (removed) tally(job, 'removed', removed); });
    while (remaining.length) {
      if (context.signal.aborted) fail('AI_CANCELLED');
      const { studio } = current(), related = createRelations(studio);
      const entries = remaining.slice(0, PLAN_BATCH).map(id => itemById(studio, id)).filter(Boolean).map(requirement => ({ requirement, related: related(requirement).filter(item => item.kind !== REQUIREMENT_KIND) }));
      if (!entries.length) { remaining = remaining.slice(PLAN_BATCH); continue; }
      // Only the few epics that resemble these requirements are sent, so the request does not grow with the plan.
      const epics = studio.plan?.epics ?? [], epicIndex = createIndex(epics.map(epic => ({ id: epic.id, parts: [[epic.name, 1]] })));
      const nearEpics = group => { const ids = new Set(epicIndex.search(group.flatMap(entry => [[entry.requirement.name, 2], [entry.requirement.fields.definition, 1]]), 12, 0).map(hit => hit.id)); return epics.filter(epic => ids.has(epic.id)); };
      let used = 1;
      try {
        const built = fitted(group => planRequest(group, nearEpics(group)), entries);
        used = built.used;
        const ids = entries.slice(0, used).map(entry => entry.requirement.id), drafts = readPlan(await call(context, built));
        context.step((draft, job) => {
          // A requirement edited while its stories were being written is left for the next run.
          const unchanged = ids.filter(id => { const live = itemById(draft, id), sent = entries.find(entry => entry.requirement.id === id).requirement; return live?.status === 'confirmed' && meaningHash(live) === meaningHash(sent); });
          const result = applyStories(draft, unchanged, drafts, now());
          tally(job, 'stories', result.written.length); job.failures += ids.length - result.written.length; job.done += ids.length;
        });
        context.streak = 0;
      } catch (error) {
        if (stops(context, error)) throw error;
        context.step((draft, job) => { job.failures += used; job.done += used; });
      }
      remaining = remaining.slice(used);
    }
  }

  function action(name, payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('INVALID_REQUEST');
    switch (name) {
      case 'studio.run': {
        exact(payload, CONSENT); requireConsent(payload);
        const { studio, backlog } = current(), work = pendingWork(studio, backlog);
        if (!work.classify.length && !work.merge && !Object.values(work.extract).some(list => list.length)) fail('STUDIO_NOTHING_TO_DO');
        begin('analyze', analyze); break;
      }
      case 'studio.enrich': {
        exact(payload, ['itemId', ...CONSENT]); requireConsent(payload);
        const item = itemById(current().studio, payload.itemId);
        if (!item) fail('STUDIO_ITEM_NOT_FOUND');
        if (item.status !== 'draft') fail('STUDIO_ITEM_CONFIRMED');
        begin('enrich', context => enrich(context, item.id), item.id); break;
      }
      case 'studio.plan': {
        exact(payload, CONSENT); requireConsent(payload);
        if (!planTargets(current().studio).length && !orphanStories(current().studio).length) fail('STUDIO_NOTHING_TO_DO');
        begin('plan', plan); break;
      }
      case 'studio.cancel': {
        exact(payload, ['jobId']);
        if (!active || active.id !== payload.jobId) fail('AI_NOT_RUNNING');
        active.controller.abort();
        update(studio => { const job = studio.jobs.find(entry => entry.id === payload.jobId); if (job?.status === 'running') Object.assign(job, { status: 'cancelled', completedAt: now() }); });
        break;
      }
      case 'studio.enable': {
        exact(payload, ['type', 'enabled']);
        if (!ARTIFACT_IDS.includes(payload.type) || typeof payload.enabled !== 'boolean') fail('STUDIO_KIND_INVALID');
        // Turning a deliverable off hides it; its items and tags stay and return when it is turned on again.
        update(studio => { studio.enabled = ARTIFACT_IDS.filter(id => id === payload.type ? payload.enabled : studio.enabled.includes(id)); });
        break;
      }
      case 'studio.item.save': {
        exact(payload, ['id', 'kind', 'name', 'fields', 'links', 'rev']);
        if (payload.id === undefined && !isKind(payload.kind)) fail('STUDIO_KIND_INVALID');
        update(studio => { saveItem(studio, payload); }); break;
      }
      case 'studio.item.status': {
        exact(payload, ['id', 'status']);
        update(studio => { setItemStatus(studio, payload.id, payload.status); }); break;
      }
      case 'studio.items.confirm': {
        exact(payload, ['kind']);
        if (!isKind(payload.kind)) fail('STUDIO_KIND_INVALID');
        update(studio => { for (const item of studio.items) if (item.kind === payload.kind && item.status === 'draft' && itemReady(studio, item)) setItemStatus(studio, item.id, 'confirmed'); });
        break;
      }
      case 'studio.proposal': {
        exact(payload, ['id', 'accept']);
        if (typeof payload.accept !== 'boolean') fail('INVALID_REQUEST');
        update(studio => { decideProposal(studio, payload.id, payload.accept); }); break;
      }
      case 'studio.issue': {
        exact(payload, ['id', 'choice', 'note']);
        update(studio => { resolveIssue(studio, payload.id, payload); }); break;
      }
      case 'studio.baseline': {
        exact(payload, ['name']);
        const content = baselineContent(current().studio);
        if (!content.some(item => item.kind === REQUIREMENT_KIND)) fail('STUDIO_BASELINE_EMPTY');
        const ref = store.writeArchive('baseline', JSON.stringify({ version: 1, createdAt: now(), items: content }));
        update(studio => {
          // The archive must hold exactly what is being frozen.
          if (JSON.stringify(baselineContent(studio)) !== JSON.stringify(content)) fail('WORKSPACE_REVISION_CONFLICT');
          recordBaseline(studio, { name: payload.name, ref, now: now() });
        });
        break;
      }
      default: fail('ACTION_UNSUPPORTED');
    }
    return view(store.read());
  }

  function view(snapshot) {
    const studio = snapshotStudio(snapshot), clauses = clauseMap(snapshot.backlog), work = pendingWork(studio, snapshot.backlog), checks = crossChecks(studio);
    const sources = (snapshot.backlog.sources ?? []).map(source => {
      const own = [...clauses.values()].filter(clause => clause.sourceId === source.id), tagged = own.filter(clause => studio.tags[clause.key]?.h === clause.hash), artifacts = {};
      for (const clause of tagged) for (const type of studio.tags[clause.key].a) artifacts[type] = (artifacts[type] ?? 0) + 1;
      return { id: source.id, title: source.title, sourceType: source.sourceType, summary: source.summary ?? '', clauses: own.length, tagged: tagged.length, requirementClauses: tagged.filter(clause => studio.tags[clause.key].r === 1).length, failed: tagged.filter(clause => studio.tags[clause.key].f).length, artifacts };
    });
    const waiting = Object.fromEntries(ARTIFACT_IDS.map(type => [type, 0]));
    for (const clause of clauses.values()) { const tag = studio.tags[clause.key]; if (tag?.h === clause.hash) for (const type of tag.a) if (!tag.x.includes(type)) waiting[type] += 1; }
    const related = createRelations(studio);
    const items = studio.items.map(item => ({ ...item, score: itemScore(studio, item), missing: missingFields(item), ready: itemReady(studio, item), sources: describeEvidence(item.evidence, clauses), related: related(item).map(other => other.id) }));
    const orphans = new Set(orphanStories(studio).map(story => story.id));
    const stories = (studio.plan?.stories ?? []).map(story => ({ ...story, stale: orphans.has(story.id) || story.hash !== meaningHash(itemById(studio, story.reqId)) }));
    // Scanning every record for sensitive patterns is skipped while a run is committing every few seconds.
    if (!active && advisories.revision !== snapshot.revision) advisories = { revision: snapshot.revision, list: collectSensitivityWarnings({ items: studio.items.map(item => ({ name: item.name, fields: item.fields })), stories: studio.plan?.stories ?? [] }, 'workspace') };
    if (!available) { try { findClaudeExecutable(); available = true; } catch { /* Shown as unavailable; probed again on the next view. */ } }
    return {
      revision: snapshot.revision, project: snapshot.backlog.project, model: AI_MODEL, available, readOnly: Boolean(store.readOnly), promptVersion: STUDIO_PROMPT_VERSION, requestLimit: REQUEST_LIMIT,
      catalog: { categories: REQUIREMENT_CATEGORIES, requirementFields: REQUIREMENT_FIELDS, types: ARTIFACT_TYPES, derived: DERIVED_DOCUMENTS, development: DEVELOPMENT_CATEGORIES, quality: QUALITY_CATEGORIES },
      sources, imports: (snapshot.metadata.imports ?? []).slice(-30).map(job => ({ requestId: job.requestId, filename: job.filename, status: job.status, errorCode: job.errorCode, sourceId: job.sourceId, readingProgress: job.readingProgress })),
      enabled: studio.enabled, items, proposals: studio.proposals.map(proposal => ({ ...proposal, sources: describeEvidence(proposal.evidence, clauses) })),
      issues: studio.issues.map(issue => ({ ...issue, ...(issue.open && issue.kind === 'variant' ? { current: variantCurrent(studio, issue) } : {}), sources: describeEvidence(issue.evidence, clauses) })), baselines: studio.baselines.map(({ ref, ...baseline }) => baseline),
      plan: studio.plan ? { epics: studio.plan.epics, stories, updatedAt: studio.plan.updatedAt } : null, planTargets: planTargets(studio).map(item => item.id), planOrphans: orphans.size,
      pending: { classify: work.classify.length, extract: Object.fromEntries(Object.entries(work.extract).map(([type, list]) => [type, list.length])), merge: work.merge, waiting },
      checks, documents: documentList(studio), jobs: studio.jobs, active: active?.id ?? null, prompts: studioPrompts(),
      sensitivityWarnings: advisories.list,
    };
  }
  function document(id) {
    const snapshot = store.read();
    return renderDocument(snapshotStudio(snapshot), id, { project: snapshot.backlog.project, clauses: clauseMap(snapshot.backlog), now: now() });
  }

  const initial = store.read();
  if (initial.metadata.studio?.jobs.some(job => job.status === 'running')) {
    // A run that was in flight when the launcher stopped is never resumed on its own.
    commit(initial.revision, next => { for (const job of next.metadata.studio.jobs) if (job.status === 'running') Object.assign(job, { status: 'interrupted', completedAt: now() }); });
  }
  return { action, view, document, get active() { return Boolean(active); }, async waitForIdle() { while (active) await active.promise; }, async close() { closed = true; active?.controller.abort(); while (active) await active.promise; } };
}
