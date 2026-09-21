// @vitest-environment node
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import type { NextConfig } from 'next';
import { afterEach, describe, expect, it, vi } from 'vitest';

const nodeRequire = createRequire(import.meta.url);
const { runCoverageWorkflow, assertCollectedCoverage } = nodeRequire('../../scripts/run-e2e-with-coverage.js') as {
  runCoverageWorkflow: (dependencies: Record<string, unknown>, arguments_?: string[]) => Promise<void>;
  assertCollectedCoverage: (directory: string) => void;
};
const { runInstrumentedBuild, removeGeneratedDirectory } = nodeRequire('../../scripts/build-instrumented.js') as {
  runInstrumentedBuild: (dependencies: Record<string, unknown>) => void;
  removeGeneratedDirectory: (directory: string, name: string) => void;
};
const directories: string[] = [];
const temporaryDirectory = () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'egov-coverage-test-'));
  directories.push(directory);
  return directory;
};
const logger = { log: vi.fn(), error: vi.fn() };
afterEach(() => {
  for (const directory of directories.splice(0)) {
    if (!path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep)) throw new Error('Unexpected test directory');
    rmSync(directory, { recursive: true });
  }
});

const wrapperDependencies = () => ({
  runner: { main: vi.fn(async (_arguments: string[]) => undefined), closedEnvironment: () => ({ PATH: 'test-path' }) },
  execute: vi.fn(), clean: vi.fn(), assertCoverage: vi.fn(), logger,
});

describe('isolated E2E coverage workflow', () => {
  it('기본 실행은 전체 프로젝트를 격리 runner에 위임하고 보고서도 닫힌 환경에서 생성한다', async () => {
    const dependencies = wrapperDependencies();
    await runCoverageWorkflow(dependencies, []);
    expect(dependencies.runner.main).toHaveBeenCalledWith(['--coverage', '--']);
    expect(dependencies.clean.mock.calls.map(call => call[1])).toEqual(['.nyc_output', 'coverage']);
    expect(dependencies.execute).toHaveBeenCalledWith(process.execPath,
      [expect.stringMatching(/nyc[\\/]bin[\\/]nyc\.js$/), 'report', '--reporter=html', '--reporter=text'],
      expect.objectContaining({ env: { PATH: 'test-path' }, stdio: 'inherit' }));
    expect(dependencies.execute.mock.calls[0][2]).not.toHaveProperty('shell');
  });

  it('명시적인 Playwright 인자는 shell 문자열 없이 그대로 전달한다', async () => {
    const dependencies = wrapperDependencies();
    const arguments_ = ['--project=api-contract', '--grep', 'a; $(not-a-command)'];
    await runCoverageWorkflow(dependencies, arguments_);
    expect(dependencies.runner.main).toHaveBeenCalledWith(['--coverage', '--', ...arguments_]);
  });

  it('runner 실패를 report 생성 뒤에도 호출자에게 전파한다', async () => {
    const dependencies = wrapperDependencies();
    const failure = new Error('isolated child exited 1');
    dependencies.runner.main.mockRejectedValue(failure);
    await expect(runCoverageWorkflow(dependencies, [])).rejects.toBe(failure);
    expect(dependencies.execute).toHaveBeenCalledOnce();
    expect(dependencies.assertCoverage).not.toHaveBeenCalled();
  });

  it('보고서 실패만 있어도 실패하며 복수 실패의 원인도 보존한다', async () => {
    const dependencies = wrapperDependencies();
    const reportFailure = new Error('report failed');
    dependencies.execute.mockImplementation(() => { throw reportFailure; });
    await expect(runCoverageWorkflow(dependencies, [])).rejects.toBe(reportFailure);
    const runFailure = new Error('runner failed');
    dependencies.runner.main.mockRejectedValue(runFailure);
    await expect(runCoverageWorkflow(dependencies, [])).rejects.toMatchObject({ errors: [runFailure, reportFailure] });
  });
});

describe('collected coverage evidence', () => {
  it('이번 실행의 유효한 파일 coverage map을 확인한 뒤 보고서를 생성한다', async () => {
    const directory = temporaryDirectory();
    const dependencies = wrapperDependencies();
    dependencies.runner.main.mockImplementation(async () => {
      writeFileSync(path.join(directory, 'page.json'), JSON.stringify({ '/synthetic/file.js': {
        path: '/synthetic/file.js', statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
        fnMap: {}, branchMap: {}, s: { 0: 1 }, f: {}, b: {},
      } }));
    });
    await expect(runCoverageWorkflow({ ...dependencies, assertCoverage: assertCollectedCoverage, coverageDirectory: directory }, [])).resolves.toBeUndefined();
    expect(dependencies.execute).toHaveBeenCalledOnce();
  });

  it.each([undefined, '{invalid-json', '{}', '[]', 'null', '{"file.js":{}}',
    '{"file.js":{"path":"file.js","statementMap":{},"fnMap":{},"branchMap":{},"s":{"0":"invalid"},"f":{},"b":{}}}',
  ])('runner와 report가 성공해도 없거나 잘못된 수집 결과는 실패한다 (%s)', content => {
    const directory = temporaryDirectory();
    if (content !== undefined) writeFileSync(path.join(directory, 'page.json'), content);
    const dependencies = wrapperDependencies();
    return expect(runCoverageWorkflow({ ...dependencies, assertCoverage: assertCollectedCoverage, coverageDirectory: directory }, []))
      .rejects.toThrow('E2E coverage results are missing or invalid.')
      .then(() => { expect(dependencies.execute).toHaveBeenCalledOnce(); });
  });

  it('수집 디렉터리가 없어도 같은 제한된 오류로 실패한다', () => {
    expect(() => assertCollectedCoverage(path.join(temporaryDirectory(), 'missing')))
      .toThrow('E2E coverage results are missing or invalid.');
  });
});

describe('instrumented build configuration ownership', () => {
  it.each([false, true])('SWC 계측 빌드 성공/실패에 Babel 설정을 만들지 않는다 (failure=%s)', shouldFail => {
    const directory = temporaryDirectory();
    mkdirSync(path.join(directory, '.next'));
    writeFileSync(path.join(directory, '.next', 'stale'), 'stale');
    const failure = new Error('synthetic build failure');
    const execute = vi.fn((command: string, args: string[], options: { env: Record<string, string> }) => {
      expect(existsSync(path.join(directory, '.babelrc'))).toBe(false);
      expect(command).toBe(process.execPath);
      expect(args.slice(1)).toEqual(['build', '--webpack']);
      expect(args[0]).toMatch(/next[\\/]dist[\\/]bin[\\/]next$/);
      expect(options.env.NEXT_PUBLIC_COVERAGE).toBe('true');
      expect(options).not.toHaveProperty('shell');
      expect(existsSync(path.join(directory, '.next', 'stale'))).toBe(false);
      if (shouldFail) throw failure;
    });
    if (shouldFail) expect(() => runInstrumentedBuild({ directory, execute, logger })).toThrow(failure);
    else runInstrumentedBuild({ directory, execute, logger });
    expect(execute).toHaveBeenCalledOnce();
    expect(existsSync(path.join(directory, '.babelrc'))).toBe(false);
  });

  it.each(['.babelrc', '.babelrc.json', 'babel.config.cjs', 'package.json'])('기존 %s 설정과 빌드 산출물을 덮어쓰지 않는다', name => {
    const directory = temporaryDirectory();
    const original = name === 'package.json' ? '{"babel":{"presets":[]}}' : 'existing configuration';
    writeFileSync(path.join(directory, name), original);
    mkdirSync(path.join(directory, '.next'));
    writeFileSync(path.join(directory, '.next', 'sentinel'), 'preserve');
    const execute = vi.fn();
    expect(() => runInstrumentedBuild({ directory, execute, logger })).toThrow(/existing Babel configuration/);
    expect(execute).not.toHaveBeenCalled();
    expect(readFileSync(path.join(directory, name), 'utf8')).toBe(original);
    expect(readFileSync(path.join(directory, '.next', 'sentinel'), 'utf8')).toBe('preserve');
  });

  it('빌드 중 생성된 다른 소유자의 설정은 삭제하지 않는다', () => {
    const directory = temporaryDirectory();
    const execute = () => writeFileSync(path.join(directory, '.babelrc'), 'replacement configuration');
    runInstrumentedBuild({ directory, execute, logger });
    expect(readFileSync(path.join(directory, '.babelrc'), 'utf8')).toBe('replacement configuration');
  });

  it('생성 경로 밖 및 junction 경로 삭제를 거부한다', () => {
    const directory = temporaryDirectory();
    const outside = temporaryDirectory();
    writeFileSync(path.join(outside, 'sentinel'), 'preserve');
    for (const name of ['..', '../coverage', outside]) {
      expect(() => removeGeneratedDirectory(directory, name)).toThrow(/outside the generated/);
    }
    symlinkSync(outside, path.join(directory, '.next'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => removeGeneratedDirectory(directory, '.next')).toThrow(/linked generated/);
    expect(readFileSync(path.join(outside, 'sentinel'), 'utf8')).toBe('preserve');
  });
});


type LoaderContext = { resourcePath: string; getOptions: () => { cwd: string }; cacheable: () => void;
  callback: (error: Error | null, code: string, map?: unknown) => void };
const instrumentationLoader = nodeRequire('../../scripts/coverage-instrumentation-loader.js') as
  (this: LoaderContext, source: string, inputMap?: unknown) => void;
const frontendDirectory = path.resolve(import.meta.dirname, '../..');
function instrument(filename: string, source: string, inputMap?: unknown) {
  let result: { code: string; map?: unknown } | undefined;
  instrumentationLoader.call({ resourcePath: path.join(frontendDirectory, filename),
    getOptions: () => ({ cwd: frontendDirectory }), cacheable: () => {},
    callback: (error, code, map) => { if (error) throw error; result = { code, map }; },
  }, source, inputMap);
  if (!result) throw new Error('Loader did not produce a result');
  return result;
}

describe('SWC-compatible coverage post-loader', () => {
  it('실제 계측 코드는 strict CSP에서 실행되고 분기/호출 coverage를 수집한다', () => {
    const result = instrument('src/components/coverage-probe.js',
      'function classify(value) { if (value > 0) return "positive"; return "other"; } globalThis.answer = classify(2);');
    const context: { answer?: string; __coverage__?: Record<string, { s: Record<string, number>; f: Record<string, number>; b: Record<string, number[]> }> } = {};
    runInNewContext(result.code, context, { contextCodeGeneration: { strings: false, wasm: false } });
    expect(context.answer).toBe('positive');
    const entry = Object.values(context.__coverage__ || {})[0];
    expect(Object.values(entry.s).some(count => count > 0)).toBe(true);
    expect(Object.values(entry.f)).toContain(1);
    expect(Object.values(entry.b).flat()).toContain(0);
    expect(result.map).toBeTruthy();
  });

  it.each([
    'src/flow.spec.ts', 'src/__tests__/flow.ts', 'src/flow.test.ts', 'src/flow.test.tsx',
    'node_modules/example/index.js', '.next/cache/example.js', 'e2e/example.ts',
    'src/app/layout.tsx', 'src/proxy.ts', 'src/services/example.ts', 'src/lib/api/example.ts',
  ])('기존 제외 경로 %s는 코드와 source map을 그대로 통과시킨다', filename => {
    const source = 'globalThis.excluded = true;';
    const map = { version: 3, sources: [filename], names: [], mappings: '' };
    expect(instrument(filename, source, map)).toEqual({ code: source, map });
  });

  it('SWC가 변환한 font import와 source map을 Babel 설정 없이 계측한다', async () => {
    const { transformSync } = nodeRequire('next/dist/build/swc');
    const filename = path.join(frontendDirectory, 'src/components/font-coverage-probe.tsx');
    const transformed = transformSync('import localFont from "next/font/local"; const value: number = 2; export const result = { localFont, value };', {
      filename, sourceMaps: true, jsc: { parser: { syntax: 'typescript', tsx: true }, target: 'es2020' }, module: { type: 'es6' },
    });
    const result = instrument('src/components/font-coverage-probe.tsx', transformed.code, transformed.map);
    expect(result.code).toContain('next/font/local');
    expect(result.code).toContain('__coverage__');
    expect(result.map).toMatchObject({ sources: expect.arrayContaining([filename]) });
  });

  it('계측 파싱 실패를 원본 코드로 조용히 통과시키지 않는다', () => {
    expect(() => instrument('src/components/invalid.js', 'const = ;')).toThrow();
  });

  it('Next 설정은 coverage 실행에만 post-loader를 연결한다', async () => {
    for (const enabled of [false, true]) {
      vi.stubEnv('NEXT_PUBLIC_COVERAGE', enabled ? 'true' : 'false');
      vi.resetModules();
      try {
        const { default: config } = await import('../../next.config.js');
        if (!enabled) {
          expect(config.webpack).toBeUndefined();
          continue;
        }
        const webpack = { module: { rules: [] } };
        const result = config.webpack!(webpack, {} as Parameters<NonNullable<NextConfig['webpack']>>[1]);
        expect(result.module.rules).toHaveLength(1);
        expect(result.module.rules[0]).toMatchObject({ enforce: 'post',
          use: [{ loader: expect.stringMatching(/coverage-instrumentation-loader\.js$/) }] });
      } finally { vi.unstubAllEnvs(); }
    }
  });
});
