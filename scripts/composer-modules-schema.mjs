/**
 * 매니페스트 v2 스키마 검사(11단계). `config/modules/` 의 기능 파일·core.json·presets.json 을 `_schema.json`(JSON Schema 2020-12,
 * ajv)으로 검사한다.
 *
 * 로더(composer-modules.mjs)와 나눈 이유: 로더는 카탈로그를 거쳐 생성기·정밀 점검의 import 폐포에 들어가고, 그 폐포는 의존성 설치
 * 전에 돌아 Node 내장 모듈만 쓴다(frontend-reachability-census.test.mjs). ajv 는 루트 개발 의존성이라 이 모듈은 의존성이 설치된
 * 자리(운영 계약 composer-modules.test.mjs, `npm run modules:check`)에서만 부른다.
 *
 * 사용: node scripts/composer-modules-schema.mjs — 스키마 검사와 로더의 파일 사이 대조를 한다(기능 파일을 고친 뒤 빠르게 확인).
 * 소스와의 대조(엔티티 테이블·화면 경로·간선·연동 근거)는 카탈로그 적재와 운영 계약이 한다.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { CORE_FILE, MODULES_DIRECTORY, MODULES_SCHEMA, PRESETS_FILE, loadComposerModules, readComposerModuleFiles } from './composer-modules.mjs';

function fail(message) { throw new Error(`composer modules: ${message}`); }

/** 디렉터리의 선언 파일을 모두 스키마로 검사한다. 어긋난 파일이 있으면 첫 파일의 이유를 모두 밝혀 멈춘다. */
export function validateComposerModuleSchema(root) {
  root = resolve(root);
  const schema = JSON.parse(readFileSync(join(root, MODULES_DIRECTORY, MODULES_SCHEMA), 'utf8'));
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  ajv.addSchema(schema);
  const validators = { module: ajv.getSchema(`${schema.$id}#/$defs/module`), core: ajv.getSchema(`${schema.$id}#/$defs/core`),
    presets: ajv.getSchema(`${schema.$id}#/$defs/presets`) };
  const files = readComposerModuleFiles(root);
  for (const [name, value] of Object.entries(files)) {
    const validator = name === CORE_FILE ? validators.core : name === PRESETS_FILE ? validators.presets : validators.module;
    if (validator(value)) continue;
    const detail = validator.errors.map(error => `${error.instancePath || '/'} ${error.message}${error.params?.additionalProperty
      ? ` (${error.params.additionalProperty})` : ''}`).join('; ');
    fail(`${name} does not match ${MODULES_SCHEMA}: ${detail}`);
  }
  return Object.keys(files).length;
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  try {
    const count = validateComposerModuleSchema(root);
    const modules = loadComposerModules(root);
    console.log(`[modules] ${count}개 파일이 ${MODULES_SCHEMA} 과 맞고, 기능 ${Object.keys(modules.declarations.features).length}개·시작 구성 ${modules.declarations.presets.length}개의 파일 사이 대조가 통과했다.`);
  } catch (error) {
    console.error(`[modules] ${error.message}`);
    process.exit(1);
  }
}
