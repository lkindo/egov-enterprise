import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import fs from 'node:fs';
import { collectPageCoverage, observePage } from './page-observation';
import { EnterpriseObservation, observedInteractionMaximum, selectSlowestInteraction, summarizeKeyboardCpuProfile, summarizeNumbers, updateClsSession } from '../helpers/enterprise-task-observation';

const guards = vi.hoisted(() => ({ install: vi.fn(), verify: vi.fn() }));
vi.mock('./error-detector', () => ({
  buildSpecScope: (file: string, title: string) => `${file} :: ${title}`,
  ConsoleErrorGuard: class { install = guards.install; verify = guards.verify; },
}));

describe('requested browser page observations', () => {
  afterEach(() => { vi.restoreAllMocks(); guards.install.mockReset(); guards.verify.mockReset(); });

  it('each requested actor page installs its guard and writes independent coverage', async () => {
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    const page = { evaluate: vi.fn().mockResolvedValue({ source: { s: { 1: 2 } } }) } as unknown as Page;
    const first = await observePage(page, { file: 'journeys/approvals.spec.ts', title: 'owner approves' });
    const second = await observePage(page, { file: 'journeys/approvals.spec.ts', title: 'approver checks' });
    await first.finish(); await second.finish();
    expect(guards.install).toHaveBeenCalledTimes(2);
    expect(guards.verify).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[0][0]).not.toBe(write.mock.calls[1][0]);
  });

  it('an unexpected browser error is red and coverage is still persisted', async () => {
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    guards.verify.mockRejectedValue(new Error('unexpected browser error'));
    const page = { evaluate: vi.fn().mockResolvedValue({ source: {} }) } as unknown as Page;
    const observation = await observePage(page, { file: 'test.spec.ts', title: 'negative probe' });
    await expect(observation.finish()).rejects.toThrow('Browser observation failed');
    expect(write).toHaveBeenCalledOnce();
  });

  it('a closed realm has no coverage, while persistence failures stay red', async () => {
    const closedPage = { evaluate: vi.fn().mockRejectedValue(new Error('closed realm')) } as unknown as Page;
    await expect(collectPageCoverage(closedPage)).resolves.toBeUndefined();
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { throw new Error('disk unavailable'); });
    const page = { evaluate: vi.fn().mockResolvedValue({ source: {} }) } as unknown as Page;
    await expect(collectPageCoverage(page)).rejects.toThrow('disk unavailable');
  });
});

describe('enterprise task observations retain metric meaning', () => {
  it('retains CPU sample locations and numbers while omitting private URLs, names and protocol ids', () => {
    const profile = { nodes: [
      { id: 1, callFrame: { url: '', lineNumber: -1, columnNumber: -1 }, children: [2, 3] },
      { id: 2, callFrame: { url: 'http://localhost/_next/static/chunks/0_z31m2mjj8w7.js?private=value', lineNumber: 0, columnNumber: 90 } },
      { id: 3, callFrame: { url: 'https://private.invalid/account/private.js', lineNumber: 99, columnNumber: 123, functionName: 'privateFunction' } },
    ], samples: [2, 3, 2], timeDeltas: [1000, 2000, 3000] };
    const result = summarizeKeyboardCpuProfile(profile);
    expect(result.sampledTimeMs).toBe(6); expect(result.sampleCount).toBe(3);
    expect(result.frames).toEqual([
      { chunk: null, line: null, column: null, selfMs: 2, inclusiveMs: 6 },
      { chunk: '0_z31m2mjj8w7.js', line: 0, column: 90, selfMs: 4, inclusiveMs: 4 },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/private|https?:|functionName|"id"|children|samples|timeDeltas/);
    expect(() => summarizeKeyboardCpuProfile({ ...profile, samples: undefined })).toThrow('Missing');
    expect(() => summarizeKeyboardCpuProfile({ ...profile, timeDeltas: [-1, 0, 0] })).toThrow('Invalid');
    expect(() => summarizeKeyboardCpuProfile({ ...profile, samples: [99, 3, 2] })).toThrow('Invalid');
    expect(() => summarizeKeyboardCpuProfile({ ...profile, nodes: profile.nodes.map(node => node.id === 2 ? { ...node, children: [1] } : node) })).toThrow('hierarchy');
  });

  it.each([false, true])('uses the CPU profiler only in diagnostic mode (%s) and labels the actual Enter', async diagnostic => {
    vi.stubEnv('E2E_ENTERPRISE_LAB_DIAGNOSTIC', String(diagnostic));
    const profile = { nodes: [{ id: 1, callFrame: { url: '', lineNumber: -1, columnNumber: -1 } }], samples: [1], timeDeltas: [1000] };
    const session = { send: vi.fn(async method => method === 'Profiler.stop' ? { profile } : undefined), on: vi.fn(), detach: vi.fn() };
    const page = { isClosed: () => false, context: () => ({ newCDPSession: async () => session }),
      exposeBinding: vi.fn(), addInitScript: vi.fn(), evaluate: vi.fn(), keyboard: { press: vi.fn() } } as unknown as Page;
    const target = { waitFor: vi.fn(), evaluate: vi.fn().mockResolvedValue(true) } as unknown as Locator;
    try {
      const observation = new EnterpriseObservation(page, 'cold', 1);
      await observation.prepare(); await observation.enter(target, 'open-modal');
      expect(page.keyboard.press).toHaveBeenCalledExactlyOnceWith('Enter');
      expect(page.evaluate).toHaveBeenLastCalledWith(expect.any(Function), 'open-modal');
      expect(observation.measurement.keyboard.enters).toBe(1);
      const profilerMethods = session.send.mock.calls.map(([method]) => method).filter(method => method.startsWith('Profiler.'));
      expect(profilerMethods).toEqual(diagnostic ? ['Profiler.enable', 'Profiler.setSamplingInterval', 'Profiler.start', 'Profiler.stop', 'Profiler.disable'] : []);
      expect(observation.measurement.keyboardCpuProfiles).toEqual(diagnostic ? [{ step: 'open-modal', sampledTimeMs: 1, sampleCount: 1,
        frames: [{ chunk: null, line: null, column: null, selfMs: 1, inclusiveMs: 1 }] }] : []);
      await observation.close();
    } finally { vi.unstubAllEnvs(); }
  });

  it('reports invalid diagnostic CPU samples as unavailable without overwriting actual task input', async () => {
    vi.stubEnv('E2E_ENTERPRISE_LAB_DIAGNOSTIC', 'true');
    const profile = { nodes: [{ id: 1, callFrame: { url: '', lineNumber: -1, columnNumber: -1 } }], samples: [1, 99], timeDeltas: [-1, 1000] };
    const session = { send: vi.fn(async method => method === 'Profiler.stop' ? { profile } : undefined), on: vi.fn(), detach: vi.fn() };
    const page = { isClosed: () => false, context: () => ({ newCDPSession: async () => session }),
      exposeBinding: vi.fn(), addInitScript: vi.fn(), evaluate: vi.fn(), keyboard: { press: vi.fn() } } as unknown as Page;
    const target = { waitFor: vi.fn(), evaluate: vi.fn().mockResolvedValue(true) } as unknown as Locator;
    try {
      const observation = new EnterpriseObservation(page, 'cold', 1);
      await observation.prepare(); await observation.enter(target, 'open-modal');
      expect(observation.measurement.keyboardCpuProfiles).toEqual([{ step: 'open-modal', sampledTimeMs: null, sampleCount: 2, frames: [],
        invalidSamples: { nonFiniteDeltas: 0, negativeDeltas: 1, unknownNodes: 1, unequalLengths: false } }]);
      expect(observation.measurement.keyboard.enters).toBe(1);
      expect(observation.measurement.observedLabInteractionMs).toBeNull();
      expect(session.send).toHaveBeenLastCalledWith('Profiler.disable'); await observation.close();
    } finally { vi.unstubAllEnvs(); }
  });

  it('does not replace a closed-page failure with CDP detach, while open-page detach failures remain red', async () => {
    let closed = false;
    const session = { send: vi.fn().mockResolvedValue(undefined), on: vi.fn(),
      detach: vi.fn().mockRejectedValue(new Error('open-page detach failed')) };
    const measuredPage = { isClosed: () => closed,
      context: () => ({ newCDPSession: vi.fn().mockResolvedValue(session) }),
      exposeBinding: vi.fn().mockResolvedValue(undefined), addInitScript: vi.fn().mockResolvedValue(undefined) } as unknown as Page;
    const observation = new EnterpriseObservation(measuredPage, 'cold', 1);
    await observation.prepare();
    await expect(observation.close()).rejects.toThrow('open-page detach failed');
    closed = true;
    await expect(observation.close()).resolves.toBeUndefined();
    expect(session.detach).toHaveBeenCalledOnce();
  });

  it('forwards only safe resource numbers and LCP shape and excludes non-interaction event entries', async () => {
    const events: Record<string, unknown>[] = [];
    const callbacks = new Map<string, (list: { getEntries: () => PerformanceEntry[] }) => void>();
    class Observer {
      static supportedEntryTypes = ['resource', 'largest-contentful-paint', 'event', 'first-input'];
      constructor(private readonly callback: (list: { getEntries: () => PerformanceEntry[] }) => void) {}
      observe(options: { type: string }) { callbacks.set(options.type, this.callback); }
      takeRecords() { return []; }
    }
    const host = { location: { pathname: '/survey/12345' },
      __enterpriseTaskLabObserve: (event: Record<string, unknown>) => { events.push(event); return Promise.resolve(); } };
    let reinstall: () => void = () => {};
    const session = { send: vi.fn().mockResolvedValue(undefined), on: vi.fn(), detach: vi.fn().mockResolvedValue(undefined) };
    const measuredPage = { isClosed: () => false, context: () => ({ newCDPSession: vi.fn().mockResolvedValue(session) }),
      exposeBinding: vi.fn().mockResolvedValue(undefined),
      addInitScript: async (install: (options: { binding: string; eventTypes: readonly string[]; targetTags: readonly string[] }) => void,
        options: { binding: string; eventTypes: readonly string[]; targetTags: readonly string[] }) => { reinstall = () => install(options); reinstall(); } } as unknown as Page;
    const dialog = document.createElement('div'); dialog.setAttribute('role', 'dialog');
    const submit = document.createElement('button'); submit.type = 'submit'; submit.id = 'private-id';
    submit.textContent = 'private button'; dialog.append(submit);
    const unknown = document.createElement('private-element'); unknown.setAttribute('aria-label', 'private name');
    vi.stubGlobal('window', host); vi.stubGlobal('document', { baseURI: 'http://localhost/private-document' });
    const clock = vi.fn().mockReturnValue(28);
    vi.stubGlobal('performance', { timeOrigin: 42, now: clock }); vi.stubGlobal('PerformanceObserver', Observer);
    const observation = new EnterpriseObservation(measuredPage, 'cold', 1);
    try {
      await observation.prepare();
      expect(events[0].documentKind).toBe('survey-detail');
      (host as unknown as { __enterpriseTaskLabStep: (step: string) => void }).__enterpriseTaskLabStep('open-modal');
      clock.mockReturnValue(70);
      (host as unknown as { __enterpriseTaskLabStep: (step: string) => void }).__enterpriseTaskLabStep('confirm-open');
      callbacks.get('resource')!({ getEntries: () => [{ entryType: 'resource', name: 'https://example.invalid/private-font.woff2?private=value',
        startTime: 4, duration: 20, transferSize: 900, encodedBodySize: 600 }] as unknown as PerformanceEntry[] });
      callbacks.get('largest-contentful-paint')!({ getEntries: () => [{ entryType: 'largest-contentful-paint', startTime: 25, duration: 0,
        size: 300, element: { tagName: 'H1', id: 'private-id', textContent: 'private text' } }] as unknown as PerformanceEntry[] });
      callbacks.get('event')!({ getEntries: () => [{ entryType: 'event', startTime: 30, duration: 900, interactionId: 0 },
        { entryType: 'event', name: 'keydown', startTime: 40, duration: 64, interactionId: 4, processingStart: 50, processingEnd: 70, target: submit },
        { entryType: 'event', name: 'private key https://example.invalid', startTime: 45, duration: 80, interactionId: 8, target: unknown }] as unknown as PerformanceEntry[] });
      callbacks.get('first-input')!({ getEntries: () => [{ entryType: 'first-input', name: 'click', startTime: 35, duration: 0, interactionId: 0,
        processingStart: 35, processingEnd: 35 }] as unknown as PerformanceEntry[] });
      expect(events.filter(event => event.kind === 'resource')).toEqual([{ kind: 'resource', document: 42, time: 4, value: 20,
        resource: { category: 'font', transferSize: 900, encodedBodySize: 600 } }]);
      expect(events.filter(event => event.kind === 'lcp')).toEqual([{ kind: 'lcp', document: 42, time: 25, value: 25, candidate: { tag: 'H1', size: 300 } }]);
      expect(events.filter(event => event.kind === 'interaction')).toEqual([
        { kind: 'interaction', document: 42, time: 40, value: 64, interactionId: 4, eventType: 'keydown', step: 'open-modal',
          target: { tag: 'BUTTON', insideDialog: true, type: 'button-submit' }, phases: { inputDelayMs: 10, processingMs: 20, presentationMs: 34 } },
        { kind: 'interaction', document: 42, time: 45, value: 80, interactionId: 8, eventType: 'OTHER', step: 'open-modal',
          target: { tag: 'OTHER', insideDialog: false, type: 'OTHER' } },
        { kind: 'interaction', document: 42, time: 35, value: 0, interactionId: 0, eventType: 'click', step: 'open-modal', target: null,
          phases: { inputDelayMs: 0, processingMs: 0, presentationMs: 0 } },
      ]);
      expect(JSON.stringify(events)).not.toMatch(/private|https?:\/\/|textContent|cookies/);
      events.length = 0; host.location.pathname = '/private-workflow-name/12345'; reinstall();
      expect(events[0].documentKind).toBe('other');
      expect(JSON.stringify(events)).not.toMatch(/private|12345|pathname/);
      await observation.reapplyCacheMode();
      expect(session.send).toHaveBeenLastCalledWith('Network.setCacheDisabled', { cacheDisabled: true });
    } finally { await observation.close(); vi.unstubAllGlobals(); }
  });

  it('records the bound entry and document CLS independently without exposing document ids', async () => {
    const session = { send: vi.fn().mockResolvedValue(undefined), on: vi.fn(), detach: vi.fn() };
    const frame = {};
    let publish: (event: object) => Promise<void> = async () => {};
    const target = { tag: 'BUTTON', insideDialog: true, type: 'button-submit' };
    const phases = { inputDelayMs: 1, processingMs: 40, presentationMs: 23 };
    const page = { context: () => ({ newCDPSession: async () => session }), mainFrame: () => frame, isClosed: () => false,
      exposeBinding: async (_name: string, callback: (source: object, event: object) => Promise<void>) => {
        publish = event => callback({ page, frame }, event);
      }, addInitScript: vi.fn(), evaluate: vi.fn().mockResolvedValue(undefined),
      goto: async () => {
        const support = { lcp: true, cls: true, event: true, firstInput: true, resource: false };
        await publish({ kind: 'support', document: 42, time: 0, value: 0, support, documentKind: 'survey-list' });
        await publish({ kind: 'interaction', document: 42, time: 10, value: 64, interactionId: 1, eventType: 'click', phases, target });
        await publish({ kind: 'shift', document: 42, time: 0, value: 0.06, documentKind: 'survey-list' });
        await publish({ kind: 'shift', document: 42, time: 500, value: 0.06, documentKind: 'survey-detail' });
        await publish({ kind: 'support', document: 99, time: 0, value: 0, support, documentKind: 'survey-detail' });
        await publish({ kind: 'shift', document: 99, time: 0, value: 0.08, documentKind: 'survey-detail' });
      } } as unknown as Page;
    const observation = new EnterpriseObservation(page, 'cold', 1);
    await observation.prepare(); await observation.navigate('/survey', async () => {});
    expect(observation.measurement.slowestInteraction).toEqual({ eventType: 'click', durationMs: 64, step: null, phases, target });
    expect(observation.measurement.documentCls).toEqual([
      { ordinal: 1, kind: 'survey-list', maximumKind: 'survey-detail', maximum: 0.12 },
      { ordinal: 2, kind: 'survey-detail', maximumKind: 'survey-detail', maximum: 0.08 },
    ]);
    expect(observation.measurement.cls).toBe(0.12);
    await observation.close();
  });

  it('retains one slowest entry with correlated phases, finite target and processing tie-break', () => {
    const zero = { eventType: 'click' as const, durationMs: 0, phases: null, target: null };
    expect(selectSlowestInteraction(null, zero)).toEqual(zero);
    const first = { eventType: 'keydown' as const, durationMs: 64,
      phases: { inputDelayMs: 10, processingMs: 20, presentationMs: 34 },
      target: { tag: 'INPUT' as const, insideDialog: false, type: 'input' as const } };
    const second = { eventType: 'click' as const, durationMs: 64,
      phases: { inputDelayMs: 1, processingMs: 40, presentationMs: 23 },
      target: { tag: 'BUTTON' as const, insideDialog: true, type: 'button-submit' as const } };
    const selected = selectSlowestInteraction(selectSlowestInteraction(null, first), second);
    expect(selected).toEqual(second);
    expect(selectSlowestInteraction(selected, first)).toBe(selected);
    expect(selectSlowestInteraction(selected, { ...second, durationMs: 32 })).toBe(selected);
    expect(selectSlowestInteraction(selected, { ...zero, durationMs: 80 }).phases).toBeNull();
    expect(selectSlowestInteraction(null, { ...first, phases: { inputDelayMs: 0, processingMs: 0, presentationMs: 0 } }).phases)
      .toEqual({ inputDelayMs: 0, processingMs: 0, presentationMs: 0 });
    expect(() => selectSlowestInteraction(null, { ...zero, durationMs: Number.NaN })).toThrow('Invalid');
    expect(() => selectSlowestInteraction(null, { ...zero, step: 'private value' } as unknown as Parameters<typeof selectSlowestInteraction>[1])).toThrow('Invalid');
    expect(() => selectSlowestInteraction(null, { ...first, phases: { ...first.phases, processingMs: -1 } })).toThrow('Invalid');
    for (const target of [{ ...first.target, tag: 'PRIVATE' }, { ...first.target, type: 'private value' },
      { ...first.target, insideDialog: 'private name' }]) {
      expect(() => selectSlowestInteraction(null, { ...first, target } as unknown as Parameters<typeof selectSlowestInteraction>[1])).toThrow('Invalid');
    }
    const extra = { ...first, target: { ...first.target, value: 'private input', id: 'private-id' } };
    expect(JSON.stringify(selectSlowestInteraction(null, extra))).not.toMatch(/private|value|"id"/);
  });

  it('uses the largest CLS session rather than the lifetime sum and ignores recent input', () => {
    let state = updateClsSession(null, { time: 0, value: 0.04, recentInput: false });
    state = updateClsSession(state, { time: 500, value: 0.03, recentInput: false });
    expect(state?.maximum).toBeCloseTo(0.07);
    expect(updateClsSession(state, { time: 600, value: 10, recentInput: true })).toBe(state);
    state = updateClsSession(state, { time: 1500, value: 0.02, recentInput: false });
    expect(state?.start).toBe(1500); expect(state?.maximum).toBeCloseTo(0.07);
    state = updateClsSession(state, { time: 1600, value: 0.06, recentInput: false });
    expect(state?.maximum).toBeCloseTo(0.08);
  });

  it('starts a new session at a one second gap or a five second window', () => {
    const initial = { start: 0, last: 4999, score: 0.09, maximum: 0.09 };
    expect(updateClsSession(initial, { time: 5000, value: 0.02, recentInput: false }))
      .toEqual({ start: 5000, last: 5000, score: 0.02, maximum: 0.09 });
    expect(updateClsSession({ start: 0, last: 500, score: 0.03, maximum: 0.03 }, { time: 1499, value: 0.04, recentInput: false })?.score)
      .toBeCloseTo(0.07);
    expect(updateClsSession({ start: 0, last: 500, score: 0.03, maximum: 0.03 }, { time: 1500, value: 0.04, recentInput: false })?.score)
      .toBe(0.04);
  });

  it('distinguishes a missing interaction from an actually observed zero duration', () => {
    expect(observedInteractionMaximum([])).toBeNull();
    expect(observedInteractionMaximum([0])).toBe(0);
    expect(observedInteractionMaximum([0, 24, 16])).toBe(24);
    expect(() => observedInteractionMaximum([Number.NaN])).toThrow('Invalid observed');
    expect(() => observedInteractionMaximum([-1])).toThrow('Invalid observed');
  });

  it('summarizes only observed samples with median, range and median absolute deviation', () => {
    expect(summarizeNumbers([100, null, 300, 200])).toEqual({ sampleCount: 4, observedCount: 3, median: 200, min: 100, max: 300, mad: 100 });
    expect(summarizeNumbers([0, null, 0])).toEqual({ sampleCount: 3, observedCount: 2, median: 0, min: 0, max: 0, mad: 0 });
    expect(summarizeNumbers([null, null, null])).toEqual({ sampleCount: 3, observedCount: 0, median: null, min: null, max: null, mad: null });
  });
});
