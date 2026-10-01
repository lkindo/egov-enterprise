import type { CDPSession, Locator, Page } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

export const ENTERPRISE_TASKS = ['user-management', 'department-hierarchy', 'board-article', 'approvals', 'survey', 'work-report', 'schedule'] as const;
export type EnterpriseTask = typeof ENTERPRISE_TASKS[number];
export type CacheMode = 'cold' | 'warm';
export const INTERACTION_EVENT_TYPES = ['keydown', 'keyup', 'click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'input', 'beforeinput', 'OTHER'] as const;
export const INTERACTION_TARGET_TAGS = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'DIV', 'SPAN', 'SVG', 'P', 'LABEL', 'TD', 'LI', 'MAIN', 'SECTION', 'OTHER'] as const;
type InteractionEventType = typeof INTERACTION_EVENT_TYPES[number];
export const KEYBOARD_STEPS = ['activate', 'keyboard-navigation', 'typing', 'select', 'escape', 'open-modal', 'open-detail',
  'confirm-open', 'confirm-cancel', 'continue-editing', 'create', 'update', 'delete', 'reparent', 'submit', 'approve', 'recover-conflict', 'respond', 'cancel'] as const;
type KeyboardStep = typeof KEYBOARD_STEPS[number];
type CpuProfile = { step: KeyboardStep; sampledTimeMs: number | null; sampleCount: number;
  invalidSamples?: { nonFiniteDeltas: number; negativeDeltas: number; unknownNodes: number; unequalLengths: boolean };
  frames: { chunk: string | null; line: number | null; column: number | null; selfMs: number; inclusiveMs: number }[] };

/** Keep static build locations and numbers, never raw URLs, function names, source or protocol ids. */
export function summarizeKeyboardCpuProfile(profile: { nodes: { id: number; callFrame: { url: string; lineNumber: number; columnNumber: number }; children?: number[] }[];
  samples?: number[]; timeDeltas?: number[] }): Omit<CpuProfile, 'step'> {
  if (!Array.isArray(profile.nodes) || !Array.isArray(profile.samples) || !Array.isArray(profile.timeDeltas)
      || profile.samples.length !== profile.timeDeltas.length) throw new Error('Missing diagnostic CPU samples.');
  const parents = new Map<number, number>(); const frames = new Map<number, CpuProfile['frames'][number]>();
  for (const node of profile.nodes) {
    let chunk: string | null = null;
    try { chunk = new URL(node.callFrame.url).pathname.match(/^\/_next\/static\/chunks\/([a-z0-9_-]{12,16}\.js)$/)?.[1] ?? null; } catch { /* Native/other frames have no retained location. */ }
    frames.set(node.id, { chunk, line: chunk ? node.callFrame.lineNumber : null, column: chunk ? node.callFrame.columnNumber : null, selfMs: 0, inclusiveMs: 0 });
    for (const child of node.children ?? []) parents.set(child, node.id);
  }
  let sampledTimeMs = 0;
  const retained = new Map<string, CpuProfile['frames'][number]>();
  const retainedFrame = (id: number) => {
    const frame = frames.get(id)!; const key = JSON.stringify([frame.chunk, frame.line, frame.column]);
    if (!retained.has(key)) retained.set(key, { ...frame, selfMs: 0, inclusiveMs: 0 });
    return { key, frame: retained.get(key)! };
  };
  for (let index = 0; index < profile.samples.length; index++) {
    const elapsed = profile.timeDeltas[index] / 1000; const id = profile.samples[index];
    if (!Number.isFinite(elapsed) || elapsed < 0 || !frames.has(id)) throw new Error('Invalid diagnostic CPU samples.');
    sampledTimeMs += elapsed; retainedFrame(id).frame.selfMs += elapsed;
    const visited = new Set<number>(); const countedLocations = new Set<string>(); let ancestor: number | undefined = id;
    while (ancestor !== undefined) {
      if (visited.has(ancestor) || !frames.has(ancestor)) throw new Error('Invalid diagnostic CPU hierarchy.');
      visited.add(ancestor);
      const location = retainedFrame(ancestor);
      if (!countedLocations.has(location.key)) location.frame.inclusiveMs += elapsed;
      countedLocations.add(location.key); ancestor = parents.get(ancestor);
    }
  }
  return { sampledTimeMs, sampleCount: profile.samples.length,
    frames: [...retained.values()].filter(frame => frame.inclusiveMs > 0).sort((a, b) => b.inclusiveMs - a.inclusiveMs || b.selfMs - a.selfMs).slice(0, 30) };
}
const DOCUMENT_KINDS = ['survey-list', 'survey-detail', 'survey-admin-detail', 'other'] as const;
type DocumentKind = typeof DOCUMENT_KINDS[number];
type DocumentCls = { ordinal: number; kind: DocumentKind; maximumKind: DocumentKind | null; maximum: number | null };
type InteractionTarget = { tag: typeof INTERACTION_TARGET_TAGS[number]; insideDialog: boolean;
  type: 'button-submit' | 'button-other' | 'input' | 'select' | 'OTHER' };
type InteractionEventNumbers = { count: number; maxDurationMs: number; maxProcessingMs: number | null };
export const LAB_CONTEXT = Object.freeze({ viewport: { width: 1280, height: 800 }, timezoneId: 'Asia/Seoul',
  locale: 'ko-KR', colorScheme: 'light' as const, reducedMotion: 'reduce' as const, deviceScaleFactor: 1, serviceWorkers: 'block' as const });
export const LAB_PROFILE = Object.freeze({ ...LAB_CONTEXT, cpuRate: 4,
  rttMs: 150, downloadBytesPerSecond: 200_000, uploadBytesPerSecond: 93_750, repetitionsPerCache: 3 });
export type ClsSession = { start: number; last: number; score: number; maximum: number };

export function updateClsSession(state: ClsSession | null, shift: { time: number; value: number; recentInput: boolean }): ClsSession | null {
  if (shift.recentInput) return state;
  if (!Number.isFinite(shift.time) || !Number.isFinite(shift.value) || shift.time < 0 || shift.value < 0) throw new Error('Invalid numeric layout shift.');
  const next = !state || shift.time - state.last >= 1000 || shift.time - state.start >= 5000
    ? { start: shift.time, last: shift.time, score: shift.value, maximum: state?.maximum ?? 0 }
    : { ...state, last: shift.time, score: state.score + shift.value };
  next.maximum = Math.max(next.maximum, next.score);
  return next;
}

export function summarizeNumbers(samples: (number | null)[]) {
  const values = samples.filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
  const median = (rows: number[]) => rows.length % 2 ? rows[Math.floor(rows.length / 2)] : (rows[rows.length / 2 - 1] + rows[rows.length / 2]) / 2;
  if (!values.length) return { sampleCount: samples.length, observedCount: 0, median: null, min: null, max: null, mad: null };
  const center = median(values);
  return { sampleCount: samples.length, observedCount: values.length, median: center, min: values[0], max: values.at(-1)!,
    mad: median(values.map(value => Math.abs(value - center)).sort((a, b) => a - b)) };
}

export function observedInteractionMaximum(durations: number[]): number | null {
  if (durations.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Invalid observed interaction duration.');
  return durations.length ? Math.max(...durations) : null;
}

type ResourceCategory = 'font' | 'script' | 'css';
type ResourceNumbers = { count: number; transferSize: number; encodedBodySize: number; maxDurationMs: number };
type LandingResources = { scope: 'landing-document-before-workflow'; categories: Record<ResourceCategory, ResourceNumbers> };
type LcpCandidate = { tag: string | null; size: number };
type InteractionNumbers = { inputDelayMs: number; processingMs: number; presentationMs: number };
type SlowestInteraction = { eventType: InteractionEventType; durationMs: number; phases: InteractionNumbers | null; target: InteractionTarget | null; step?: KeyboardStep | null };
type InteractionPhases = { observedCount: number; inputDelayMaxMs: number | null; processingMaxMs: number | null;
  presentationMaxMs: number | null; presentationIsRoundedEstimate: true };
type MetricEvent = { kind: 'support' | 'lcp' | 'shift' | 'interaction' | 'resource'; document: number; time: number;
  value: number; recentInput?: boolean; interactionId?: number; candidate?: LcpCandidate; phases?: InteractionNumbers;
  eventType?: InteractionEventType;
  target?: InteractionTarget | null;
  documentKind?: DocumentKind;
  step?: KeyboardStep | null;
  resource?: { category: ResourceCategory; transferSize: number; encodedBodySize: number };
  support?: { lcp: boolean; cls: boolean; event: boolean; firstInput: boolean; resource: boolean } };
type DocumentMetrics = { support: NonNullable<MetricEvent['support']>; kind: DocumentKind; maximumKind: DocumentKind | null; lcp: number | null; cls: ClsSession | null;
  candidate: LcpCandidate | null; resources: Record<ResourceCategory, ResourceNumbers> };
type ActionLabel = 'create' | 'update' | 'delete' | 'reparent' | 'submit' | 'approve' | 'recover-conflict' | 'respond' | 'cancel';
export type Measurement = {
  cache: CacheMode; iteration: number; outcome: 'passed' | 'failed'; failureStage: string | null;
  lcpMs: number | null; cls: number | null; observedLabInteractionMs: number | null; observedInteractionCount: number;
  landingLcpCandidate: LcpCandidate | null; landingResources: LandingResources | null;
  interactionPhases: InteractionPhases;
  /** Counts PerformanceEventTiming entries for this actor; independent maxima, not one event's decomposition. */
  interactionEventTypes: Partial<Record<InteractionEventType, InteractionEventNumbers>>;
  /** One entry for this actor; duration ties prefer its larger processing time. */
  slowestInteraction: SlowestInteraction | null;
  /** Initial document kind and route kind when its unmodified CLS maximum increased. */
  documentCls: DocumentCls[];
  keyboardCpuProfiles: CpuProfile[];
  landingNavigation: { responseStartMs: number; responseEndMs: number; domContentLoadedMs: number; firstContentfulPaintMs: number | null } | null;
  taskActionToAuthoritativeReadbackMs: { action: ActionLabel; milliseconds: number }[];
  keyboard: { tabs: number; enters: number; escapes: number; checks: { check: string; passed: boolean }[] };
  accessibility: { observed: boolean; violations: { id: string; impact: string | null; nodes: number }[] };
  cdp: { actualPage: boolean; cpuApplied: boolean; networkApplied: boolean; cacheDisabled: boolean | null; cacheHits: number; cacheReapplications: number };
  actorPages: { cdp: Measurement['cdp']; observedLabInteractionMs: number | null; observedInteractionCount: number;
    accessibility: Measurement['accessibility']; landingLcpCandidate: LcpCandidate | null; landingResources: LandingResources | null;
    interactionPhases: InteractionPhases; interactionEventTypes: Measurement['interactionEventTypes']; slowestInteraction: SlowestInteraction | null; documentCls: DocumentCls[];
    keyboardCpuProfiles: CpuProfile[]; landingNavigation: Measurement['landingNavigation'] }[];
  runtime: { browserVersion: string; nodeVersion: string; playwrightVersion: string } | null;
  fixture: { primaryActor: 'administrator' | 'ordinary-user'; secondaryActors: number; ownedSeedCounts: Record<string, number> } | null;
  complete: boolean;
};

export function selectSlowestInteraction(previous: SlowestInteraction | null, candidate: SlowestInteraction): SlowestInteraction {
  const { eventType, durationMs, phases, target, step } = candidate;
  if (!INTERACTION_EVENT_TYPES.includes(eventType) || !Number.isFinite(durationMs) || durationMs < 0
      || phases !== null && ![phases.inputDelayMs, phases.processingMs, phases.presentationMs].every(value => Number.isFinite(value) && value >= 0)
      || step != null && !KEYBOARD_STEPS.includes(step)
      || target !== null && (!INTERACTION_TARGET_TAGS.includes(target.tag) || typeof target.insideDialog !== 'boolean'
        || !['button-submit', 'button-other', 'input', 'select', 'OTHER'].includes(target.type))) throw new Error('Invalid safe slowest interaction.');
  if (previous && (durationMs < previous.durationMs || durationMs === previous.durationMs
      && (phases?.processingMs ?? -1) <= (previous.phases?.processingMs ?? -1))) return previous;
  return { eventType, durationMs, ...(step === undefined ? {} : { step }), phases: phases === null ? null : { inputDelayMs: phases.inputDelayMs,
    processingMs: phases.processingMs, presentationMs: phases.presentationMs },
    target: target === null ? null : { tag: target.tag, insideDialog: target.insideDialog, type: target.type } };
}

/** Browser callbacks forward numeric observations only; no DOM, URL, text, ids or credentials. */
function installObservers({ binding, eventTypes, targetTags }: { binding: string; eventTypes: readonly InteractionEventType[];
  targetTags: readonly InteractionTarget['tag'][] }) {
  type Entry = PerformanceEntry & { value?: number; hadRecentInput?: boolean; interactionId?: number; size?: number; element?: Element | null;
    transferSize?: number; encodedBodySize?: number; initiatorType?: string; processingStart?: number; processingEnd?: number; target?: Element | null };
  const host = window as unknown as Record<string, unknown>;
  const pending = new Set<Promise<unknown>>(); const observers: PerformanceObserver[] = [];
  const steps: { time: number; step: KeyboardStep }[] = [];
  host.__enterpriseTaskLabStep = (step: KeyboardStep) => { steps.push({ time: performance.now(), step }); };
  const emit = (event: MetricEvent) => {
    const promise = (host[binding] as (value: MetricEvent) => Promise<unknown>)(event);
    pending.add(promise); void promise.finally(() => pending.delete(promise));
  };
  const supported = PerformanceObserver.supportedEntryTypes;
  const documentKind = (): DocumentKind => {
    const pathname = window.location?.pathname ?? '';
    return pathname === '/survey' ? 'survey-list' : /^\/survey\/[1-9]\d*$/.test(pathname) ? 'survey-detail'
      : /^\/survey\/response\/[1-9]\d*$/.test(pathname) ? 'survey-admin-detail' : 'other';
  };
  const support = { lcp: supported.includes('largest-contentful-paint'), cls: supported.includes('layout-shift'),
    event: supported.includes('event'), firstInput: supported.includes('first-input'), resource: supported.includes('resource') };
  emit({ kind: 'support', document: performance.timeOrigin, time: 0, value: 0, support, documentKind: documentKind() });
  const consume = (kind: 'lcp' | 'shift' | 'interaction' | 'resource', entries: PerformanceEntry[]) => {
    for (const raw of entries) {
      const entry = raw as Entry;
      if (kind === 'interaction' && entry.entryType !== 'first-input' && !(entry.interactionId! > 0)) continue;
      if (kind === 'resource') {
        // Classify internally; never forward a resource URL, frame URL, DOM text, ids or credentials.
        let pathname: string; try { pathname = new URL(entry.name, document.baseURI).pathname; } catch { continue; }
        const category: ResourceCategory | null = /\.(?:woff2?|ttf|otf|eot)$/i.test(pathname) ? 'font'
          : entry.initiatorType === 'script' || /\.js$/i.test(pathname) ? 'script' : /\.css$/i.test(pathname) ? 'css' : null;
        if (category) emit({ kind, document: performance.timeOrigin, time: entry.startTime, value: entry.duration,
          resource: { category, transferSize: entry.transferSize!, encodedBodySize: entry.encodedBodySize! } });
        continue;
      }
      const candidateTag = entry.element?.tagName ?? null;
      emit({ kind, document: performance.timeOrigin, time: entry.startTime,
        value: kind === 'lcp' ? entry.startTime : kind === 'shift' ? entry.value! : entry.duration,
        ...(kind === 'lcp' ? { candidate: { tag: candidateTag === null ? null
          : /^(?:H[1-6]|P|DIV|SPAN|IMG|SVG|SECTION|ARTICLE|MAIN|BUTTON|TD|LI|A|TEXTAREA|INPUT|LABEL)$/.test(candidateTag) ? candidateTag : 'OTHER',
          size: entry.size! } } : {}),
        ...(kind === 'shift' ? { recentInput: entry.hadRecentInput === true, documentKind: documentKind() } : {}),
        ...(kind === 'interaction' ? { interactionId: entry.interactionId ?? 0,
          step: steps.findLast(step => step.time <= entry.startTime)?.step ?? null,
          eventType: eventTypes.includes(entry.name as InteractionEventType) ? entry.name as InteractionEventType : 'OTHER',
          target: entry.target instanceof Element ? { tag: targetTags.includes(entry.target.tagName as InteractionTarget['tag'])
            ? entry.target.tagName as InteractionTarget['tag'] : 'OTHER', insideDialog: entry.target.closest('dialog,[role="dialog"]') !== null,
          type: entry.target.tagName === 'BUTTON' ? (entry.target as HTMLButtonElement).type === 'submit' ? 'button-submit' : 'button-other'
            : entry.target.tagName === 'INPUT' || entry.target.tagName === 'TEXTAREA' ? 'input' : entry.target.tagName === 'SELECT' ? 'select' : 'OTHER' } : null } : {}),
        ...(kind === 'interaction' && Number.isFinite(entry.processingStart) && Number.isFinite(entry.processingEnd)
          && entry.processingStart! >= entry.startTime && entry.processingEnd! >= entry.processingStart!
          ? { phases: { inputDelayMs: entry.processingStart! - entry.startTime, processingMs: entry.processingEnd! - entry.processingStart!,
            // EventTiming duration is quantized; the inferred presentation segment can otherwise be slightly negative.
            presentationMs: Math.max(0, entry.startTime + entry.duration - entry.processingEnd!) } } : {}) });
    }
  };
  for (const [type, kind] of [['largest-contentful-paint', 'lcp'], ['layout-shift', 'shift'], ['event', 'interaction'], ['first-input', 'interaction'], ['resource', 'resource']] as const) {
    if (!supported.includes(type)) continue;
    const observer = new PerformanceObserver(list => consume(kind, list.getEntries()));
    observer.observe({ type, buffered: true, ...(type === 'event' ? { durationThreshold: 16 } : {}) } as PerformanceObserverInit);
    observers.push(observer);
  }
  host.__enterpriseTaskLabFlush = async () => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    // Let EventTiming's presentation timestamps and observer callbacks complete before taking records.
    await new Promise(done => setTimeout(done, 500));
    for (const observer of observers) {
      const entries = observer.takeRecords();
      for (const type of ['largest-contentful-paint', 'layout-shift', 'event', 'first-input', 'resource']) {
        const kind = type === 'largest-contentful-paint' ? 'lcp' : type === 'layout-shift' ? 'shift' : type === 'resource' ? 'resource' : 'interaction';
        consume(kind, entries.filter(entry => entry.entryType === type));
      }
    }
    await Promise.all([...pending]);
  };
}

export class EnterpriseObservation {
  readonly page: Page;
  readonly measurement: Measurement;
  private session: CDPSession | null = null;
  private armed = false;
  private landing: number | null = null;
  private documents = new Map<number, DocumentMetrics>();
  private interactions = new Map<string, number>();
  private phases = new Map<string, InteractionNumbers>();
  private cacheRequests = new Set<string>();
  private actors: EnterpriseObservation[] = [];
  private actionStep: KeyboardStep = 'activate';
  private diagnostic = process.env.E2E_ENTERPRISE_LAB_DIAGNOSTIC === 'true';
  constructor(page: Page, cache: CacheMode, iteration: number) {
    this.page = page;
    this.measurement = { cache, iteration, outcome: 'failed', failureStage: 'fixture', lcpMs: null, cls: null,
      landingLcpCandidate: null, landingResources: null,
      interactionPhases: { observedCount: 0, inputDelayMaxMs: null, processingMaxMs: null, presentationMaxMs: null, presentationIsRoundedEstimate: true },
      interactionEventTypes: {}, slowestInteraction: null, documentCls: [], keyboardCpuProfiles: [], landingNavigation: null,
      observedLabInteractionMs: null, observedInteractionCount: 0, taskActionToAuthoritativeReadbackMs: [],
      keyboard: { tabs: 0, enters: 0, escapes: 0, checks: [] }, accessibility: { observed: false, violations: [] },
      cdp: { actualPage: false, cpuApplied: false, networkApplied: false, cacheDisabled: null, cacheHits: 0, cacheReapplications: 0 }, actorPages: [],
      runtime: null, fixture: null, complete: false };
  }
  async prepare() {
    this.session = await this.page.context().newCDPSession(this.page);
    this.measurement.cdp.actualPage = true;
    await this.session.send('Emulation.setCPUThrottlingRate', { rate: LAB_PROFILE.cpuRate });
    this.measurement.cdp.cpuApplied = true;
    await this.session.send('Network.enable');
    await this.session.send('Network.emulateNetworkConditions', { offline: false, latency: LAB_PROFILE.rttMs,
      downloadThroughput: LAB_PROFILE.downloadBytesPerSecond, uploadThroughput: LAB_PROFILE.uploadBytesPerSecond });
    this.measurement.cdp.networkApplied = true;
    const disabled = this.measurement.cache === 'cold';
    if (disabled) await this.session.send('Network.clearBrowserCache');
    await this.session.send('Network.setCacheDisabled', { cacheDisabled: disabled });
    this.measurement.cdp.cacheDisabled = disabled;
    const cacheHit = (requestId: string) => {
      if (this.armed) { this.cacheRequests.add(requestId); this.measurement.cdp.cacheHits = this.cacheRequests.size; }
    };
    this.session.on('Network.requestServedFromCache', event => cacheHit(event.requestId));
    this.session.on('Network.responseReceived', event => {
      if (event.response.fromDiskCache || event.response.fromPrefetchCache) cacheHit(event.requestId);
    });
    await this.page.exposeBinding('__enterpriseTaskLabObserve', (source, event: MetricEvent) => {
      if (!this.armed || source.page !== this.page || source.frame !== this.page.mainFrame()) return;
      if (![event.document, event.time, event.value].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid lab numeric observation.');
      if ((event.kind === 'support' || event.kind === 'shift') && (!event.documentKind || !DOCUMENT_KINDS.includes(event.documentKind))) throw new Error('Invalid finite document kind.');
      if (event.kind === 'support') {
        const empty = (): ResourceNumbers => ({ count: 0, transferSize: 0, encodedBodySize: 0, maxDurationMs: 0 });
        this.documents.set(event.document, { support: event.support!, kind: event.documentKind!, maximumKind: null, lcp: null, cls: null, candidate: null,
          resources: { font: empty(), script: empty(), css: empty() } });
        this.landing ??= event.document;
        return;
      }
      const state = this.documents.get(event.document);
      if (!state) throw new Error('Lab entry arrived before observer initialization.');
      if (event.kind === 'lcp') {
        if (event.candidate && (!Number.isFinite(event.candidate.size) || event.candidate.size < 0
            || event.candidate.tag !== null && !/^(?:H[1-6]|P|DIV|SPAN|IMG|SVG|SECTION|ARTICLE|MAIN|BUTTON|TD|LI|A|TEXTAREA|INPUT|LABEL|OTHER)$/.test(event.candidate.tag))) {
          throw new Error('Invalid safe LCP candidate.');
        }
        if (state.lcp === null || event.value >= state.lcp) { state.lcp = event.value; state.candidate = event.candidate ?? null; }
      }
      if (event.kind === 'resource') {
        const resource = event.resource;
        if (!resource || !['font', 'script', 'css'].includes(resource.category)
            || ![resource.transferSize, resource.encodedBodySize].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid safe resource numbers.');
        const category = state.resources[resource.category]; category.count += 1;
        category.transferSize += resource.transferSize; category.encodedBodySize += resource.encodedBodySize;
        category.maxDurationMs = Math.max(category.maxDurationMs, event.value);
      }
      if (event.kind === 'shift') {
        const priorMaximum = state.cls?.maximum ?? 0;
        state.cls = updateClsSession(state.cls, { time: event.time, value: event.value, recentInput: event.recentInput === true });
        if ((state.cls?.maximum ?? 0) > priorMaximum) state.maximumKind = event.documentKind!;
      }
      if (event.kind === 'interaction') {
        if (!event.eventType || !INTERACTION_EVENT_TYPES.includes(event.eventType)) throw new Error('Invalid finite interaction event type.');
        const key = `${event.document}:${event.interactionId || `first:${event.time}`}`;
        this.interactions.set(key, Math.max(this.interactions.get(key) ?? 0, event.value));
        if (event.phases) {
          if (!Object.values(event.phases).every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid safe interaction phase numbers.');
          const prior = this.phases.get(key);
          this.phases.set(key, { inputDelayMs: Math.max(prior?.inputDelayMs ?? 0, event.phases.inputDelayMs),
            processingMs: Math.max(prior?.processingMs ?? 0, event.phases.processingMs),
            presentationMs: Math.max(prior?.presentationMs ?? 0, event.phases.presentationMs) });
        }
        const priorType = this.measurement.interactionEventTypes[event.eventType];
        this.measurement.interactionEventTypes[event.eventType] = { count: (priorType?.count ?? 0) + 1,
          maxDurationMs: Math.max(priorType?.maxDurationMs ?? 0, event.value),
          maxProcessingMs: event.phases ? Math.max(priorType?.maxProcessingMs ?? 0, event.phases.processingMs) : priorType?.maxProcessingMs ?? null };
        this.measurement.slowestInteraction = selectSlowestInteraction(this.measurement.slowestInteraction, { step: event.step ?? null,
          eventType: event.eventType, durationMs: event.value, phases: event.phases ?? null, target: event.target ?? null });
      }
    });
    await this.page.addInitScript(installObservers, { binding: '__enterpriseTaskLabObserve', eventTypes: INTERACTION_EVENT_TYPES, targetTags: INTERACTION_TARGET_TAGS });
  }
  async reapplyCacheMode() {
    if (!this.session) throw new Error('Measured page CDP was not prepared.');
    const cacheDisabled = this.measurement.cache === 'cold';
    await this.session.send('Network.setCacheDisabled', { cacheDisabled });
    this.measurement.cdp.cacheDisabled = cacheDisabled; this.measurement.cdp.cacheReapplications += 1;
  }
  async navigate(route: string, ready: () => Promise<void>) {
    this.measurement.failureStage = 'navigation';
    if (this.measurement.cache === 'warm') {
      await this.page.goto(route, { waitUntil: 'domcontentloaded' }); await ready();
      await this.page.evaluate(async () => { await document.fonts.ready; });
      // Drain the prime document and all binding promises while unarmed, before the measured reload.
      await this.flush();
      this.documents.clear(); this.interactions.clear(); this.phases.clear(); this.cacheRequests.clear(); this.landing = null;
      this.measurement.lcpMs = null; this.measurement.cls = null;
      this.measurement.observedLabInteractionMs = null; this.measurement.observedInteractionCount = 0;
      this.measurement.interactionEventTypes = {}; this.measurement.slowestInteraction = null; this.measurement.documentCls = [];
      this.measurement.cdp.cacheHits = 0;
      this.armed = true;
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    } else {
      this.armed = true;
      await this.page.goto(route, { waitUntil: 'domcontentloaded' });
    }
    await ready();
    await this.page.evaluate(async () => { await document.fonts.ready; });
    await this.flush();
    this.measurement.landingNavigation = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!navigation) return null;
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      return { responseStartMs: navigation.responseStart, responseEndMs: navigation.responseEnd,
        domContentLoadedMs: navigation.domContentLoadedEventEnd, firstContentfulPaintMs: paint?.startTime ?? null };
    }) ?? null;
    const landing = this.landing === null ? null : this.documents.get(this.landing);
    this.measurement.landingResources = landing?.support.resource
      ? { scope: 'landing-document-before-workflow', categories: structuredClone(landing.resources) } : null;
    this.measurement.failureStage = 'workflow';
  }
  async flush() {
    await this.page.evaluate(async () => {
      const flush = (window as unknown as { __enterpriseTaskLabFlush?: () => Promise<void> }).__enterpriseTaskLabFlush;
      if (!flush) throw new Error('Lab performance observers were not installed on the measured page.');
      await flush();
    });
    this.measurement.lcpMs = this.landing === null ? null : this.documents.get(this.landing)?.lcp ?? null;
    this.measurement.landingLcpCandidate = this.landing === null ? null : this.documents.get(this.landing)?.candidate ?? null;
    const supportedCls = [...this.documents.values()].filter(state => state.support.cls);
    this.measurement.cls = supportedCls.length ? Math.max(...supportedCls.map(state => state.cls?.maximum ?? 0)) : null;
    this.measurement.documentCls = [...this.documents.values()].map((state, index) => ({ ordinal: index + 1,
      kind: state.kind, maximumKind: state.maximumKind, maximum: state.support.cls ? state.cls?.maximum ?? 0 : null }));
    this.measurement.observedInteractionCount = this.interactions.size;
    this.measurement.observedLabInteractionMs = observedInteractionMaximum([...this.interactions.values()]);
    const phases = [...this.phases.values()];
    this.measurement.interactionPhases = { observedCount: phases.length,
      inputDelayMaxMs: observedInteractionMaximum(phases.map(value => value.inputDelayMs)),
      processingMaxMs: observedInteractionMaximum(phases.map(value => value.processingMs)),
      presentationMaxMs: observedInteractionMaximum(phases.map(value => value.presentationMs)), presentationIsRoundedEstimate: true };
  }
  async tabTo(target: Locator) {
    await target.waitFor({ state: 'visible' });
    await this.markStep('keyboard-navigation');
    for (let count = 0; count < 160; count++) {
      if (await target.evaluate(element => element === document.activeElement)) return;
      await this.page.keyboard.press('Tab'); this.measurement.keyboard.tabs += 1;
    }
    throw new Error('Task action is unreachable through keyboard Tab.');
  }
  private async markStep(step: KeyboardStep) {
    await this.page.evaluate(value => {
      const mark = (window as unknown as { __enterpriseTaskLabStep?: (step: KeyboardStep) => void }).__enterpriseTaskLabStep;
      if (!mark) throw new Error('Lab keyboard step recorder was not installed.');
      mark(value);
    }, step);
  }
  private async pressActivation(key: 'Enter' | 'Escape', step: KeyboardStep) {
    await this.markStep(step);
    if (!this.diagnostic) { await this.page.keyboard.press(key); return; }
    if (!this.session) throw new Error('Diagnostic keyboard CPU profiler requires measured page CDP.');
    await this.session.send('Profiler.enable');
    await this.session.send('Profiler.setSamplingInterval', { interval: 1000 });
    await this.session.send('Profiler.start');
    try { await this.page.keyboard.press(key); }
    finally {
      try {
        const { profile } = await this.session.send('Profiler.stop');
        try { this.measurement.keyboardCpuProfiles.push({ step, ...summarizeKeyboardCpuProfile(profile) }); }
        catch (error) {
          if (!(error instanceof Error) || error.message !== 'Invalid diagnostic CPU samples.') throw error;
          // The optional CPU diagnostic must report invalid samples without replacing real task observations.
          // Never clamp a negative delta or publish a fabricated zero CPU duration.
          const ids = new Set(profile.nodes.map(node => node.id));
          this.measurement.keyboardCpuProfiles.push({ step, sampledTimeMs: null, sampleCount: profile.samples?.length ?? 0, frames: [],
            invalidSamples: { nonFiniteDeltas: profile.timeDeltas?.filter(value => !Number.isFinite(value)).length ?? 0,
              negativeDeltas: profile.timeDeltas?.filter(value => value < 0).length ?? 0,
              unknownNodes: profile.samples?.filter(value => !ids.has(value)).length ?? 0,
              unequalLengths: profile.samples?.length !== profile.timeDeltas?.length } });
        }
      } finally { await this.session.send('Profiler.disable'); }
    }
  }
  async enter(target: Locator, step: KeyboardStep = this.actionStep) {
    await this.tabTo(target);
    await this.pressActivation('Enter', step); this.measurement.keyboard.enters += 1;
  }
  async fill(target: Locator, value: string) {
    await this.tabTo(target); await this.markStep('typing');
    await this.page.keyboard.press('ControlOrMeta+A'); await this.page.keyboard.type(value);
  }
  async select(target: Locator, value: string) {
    await this.tabTo(target);
    const index = await target.evaluate((element, expected) => [...(element as HTMLSelectElement).options].findIndex(option => option.value === expected), value);
    if (index < 0) throw new Error('Owned fixture option is missing.');
    await this.markStep('select');
    await this.page.keyboard.press('Home');
    for (let step = 0; step < index; step++) await this.page.keyboard.press('ArrowDown');
    await this.pressActivation('Enter', 'select'); this.measurement.keyboard.enters += 1;
    if (await target.inputValue() !== value) throw new Error('Keyboard option selection did not persist.');
  }
  async escape() { await this.pressActivation('Escape', 'escape'); this.measurement.keyboard.escapes += 1; }
  async keyboardCheck(check: string, verify: () => Promise<boolean>) {
    let passed = false;
    try { passed = await verify(); } catch { /* Preserve the failed check and continue collecting task evidence. */ }
    this.measurement.keyboard.checks.push({ check, passed });
  }
  async action(action: ActionLabel, activate: () => Promise<void>, readback: () => Promise<void>) {
    const start = performance.now(); const previousStep = this.actionStep; this.actionStep = action;
    try { await activate(); } finally { this.actionStep = previousStep; }
    await readback();
    this.measurement.taskActionToAuthoritativeReadbackMs.push({ action, milliseconds: performance.now() - start });
  }
  includeActor(actor: EnterpriseObservation) { this.actors.push(actor); }
  observedActors() { return [...this.actors]; }
  async finish() {
    await this.flush();
    for (const actor of this.actors) {
      await actor.finish();
      const sample = actor.measurement;
      this.measurement.actorPages.push({ cdp: sample.cdp, observedLabInteractionMs: sample.observedLabInteractionMs,
        observedInteractionCount: sample.observedInteractionCount, accessibility: sample.accessibility,
        landingLcpCandidate: sample.landingLcpCandidate, landingResources: sample.landingResources, interactionPhases: sample.interactionPhases,
        interactionEventTypes: sample.interactionEventTypes, slowestInteraction: sample.slowestInteraction, documentCls: sample.documentCls,
        keyboardCpuProfiles: sample.keyboardCpuProfiles, landingNavigation: sample.landingNavigation });
      this.measurement.observedInteractionCount += sample.observedInteractionCount;
      if (sample.observedLabInteractionMs !== null) this.measurement.observedLabInteractionMs = Math.max(this.measurement.observedLabInteractionMs ?? 0, sample.observedLabInteractionMs);
      this.measurement.interactionPhases.observedCount += sample.interactionPhases.observedCount;
      for (const component of ['inputDelayMaxMs', 'processingMaxMs', 'presentationMaxMs'] as const) {
        const value = sample.interactionPhases[component];
        if (value !== null) this.measurement.interactionPhases[component] = Math.max(this.measurement.interactionPhases[component] ?? 0, value);
      }
      this.measurement.keyboard.tabs += sample.keyboard.tabs;
      this.measurement.keyboard.enters += sample.keyboard.enters;
      this.measurement.keyboard.escapes += sample.keyboard.escapes;
      this.measurement.keyboard.checks.push(...sample.keyboard.checks);
    }
    this.measurement.complete = true; this.armed = false;
  }
  async close() { for (const actor of this.actors) await actor.close(); if (!this.page.isClosed()) await this.session?.detach(); }
}

export function persistTaskMeasurement(task: EnterpriseTask, runId: string, measurement: Measurement) {
  const diagnostic = process.env.E2E_ENTERPRISE_LAB_DIAGNOSTIC === 'true';
  const evidenceKind = diagnostic ? 'enterprise-task-lab-diagnostic-measurements' : 'enterprise-task-lab-measurements';
  const root = resolve(__dirname, '../../..');
  const outputSetting = process.env.E2E_ENTERPRISE_LAB_OUTPUT_DIR; const receiptSetting = process.env.E2E_ENTERPRISE_LAB_RECEIPT;
  if (!outputSetting || !receiptSetting || !/^[a-f0-9]{24}$/u.test(runId)) throw new Error('Missing owned lab output binding.');
  const output = resolve(root, outputSetting); const receipt = resolve(root, receiptSetting);
  if (relative(root, output).split(sep).join('/') !== `build/isolated-e2e/${runId}/enterprise-task-lab`
      || receipt !== join(dirname(output), 'enterprise-task-lab-build.json') || !ENTERPRISE_TASKS.includes(task)) throw new Error('Lab output is not bound to this owned runtime.');
  for (let directory = output; directory !== root; directory = dirname(directory)) {
    if (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory()) throw new Error('Lab output directory must be regular.');
  }
  if (realpathSync(output) !== output || lstatSync(receipt).isSymbolicLink() || !lstatSync(receipt).isFile()) throw new Error('Lab receipt must be regular.');
  const buildReceiptSha256 = createHash('sha256').update(readFileSync(receipt)).digest('hex');
  const file = join(output, `${task}.json`);
  let measurements: Measurement[] = [];
  try {
    if (lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile()) throw new Error('Lab measurement must be regular.');
    const previous = JSON.parse(readFileSync(file, 'utf8')) as { evidenceKind: string; task: string; buildReceiptSha256: string; measurements: Measurement[] };
    if (previous.evidenceKind !== evidenceKind || previous.task !== task || previous.buildReceiptSha256 !== buildReceiptSha256) throw new Error('Stale lab measurement binding.');
    measurements = previous.measurements;
  } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  if (measurements.some(record => record.cache === measurement.cache && record.iteration === measurement.iteration)) throw new Error('Lab samples must not overwrite a prior attempt.');
  measurements.push(measurement); measurements.sort((a, b) => a.cache.localeCompare(b.cache) || a.iteration - b.iteration);
  const summary = Object.fromEntries((['cold', 'warm'] as const).map(cache => {
    const rows = measurements.filter(record => record.cache === cache);
    return [cache, Object.fromEntries((['lcpMs', 'cls', 'observedLabInteractionMs'] as const).map(metric => [metric, summarizeNumbers(rows.map(row => row[metric]))]))];
  }));
  const temporary = join(output, `${task}.${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify({ schemaVersion: 1, evidenceKind, task, buildReceiptSha256,
    profile: diagnostic ? { ...LAB_PROFILE, repetitionsPerCache: 1 } : LAB_PROFILE, metricScope: { lcp: 'landing-navigation', cls: 'maximum-session-per-document',
      interaction: 'observed-lab-interactions', action: 'task-action-to-authoritative-readback-proxy' }, measurements, summary }, null, 2), { flag: 'wx', mode: 0o600 });
  renameSync(temporary, file);
}
