import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type {
  GeneratedOperationDescriptor,
  GeneratedOperationId,
  GeneratedMultipartLogicalRequest,
  GeneratedOperationPath,
  GeneratedOperationQuery,
  GeneratedOperationRequest,
  GeneratedOperationResponse,
  GeneratedResponseKind,
} from '@/types/generated-operations';

const API_PREFIX = '/api/v1/';
const PATH_PARAMETER_PATTERN = /\{([^}]+)\}/g;
const AXIOS_HEADER_GROUPS = new Set(['common', 'delete', 'get', 'head', 'post', 'put', 'patch']);
const SAFE_CONFIG_KEYS = [
  'headers',
  'timeout',
  'timeoutErrorMessage',
  'withCredentials',
  'signal',
  'cancelToken',
  'onUploadProgress',
  'onDownloadProgress',
  'suppressErrorToast',
] as const satisfies readonly (keyof AxiosRequestConfig)[];
const SAFE_CONFIG_KEY_SET = new Set<string>(SAFE_CONFIG_KEYS);

// 공통 성공 envelope는 특정 도메인 DTO를 재정의하는 스키마가 아니라, operation별
// generated envelope를 적용하기 전에 data를 안전하게 꺼내기 위한 transport protocol이다.
const successfulEnvelopeSchema = z.looseObject({
  success: z.literal(true),
  code: z.string(),
  message: z.string(),
  data: z.unknown().optional(),
  status: z.number().int().optional(),
  timestamp: z.string().optional(),
});

type RequiredKeys<Value> = Value extends object
  ? { [Key in keyof Value]-?: Record<never, never> extends Pick<Value, Key> ? never : Key }[keyof Value]
  : never;

type GeneratedPathArguments<Descriptor extends GeneratedOperationDescriptor> =
  [GeneratedOperationPath<Descriptor['id']>] extends [never]
    ? { path?: never }
    : { path: GeneratedOperationPath<Descriptor['id']> };

type GeneratedQueryArguments<Descriptor extends GeneratedOperationDescriptor> =
  [GeneratedOperationQuery<Descriptor['id']>] extends [never]
    ? { query?: never }
    : [RequiredKeys<GeneratedOperationQuery<Descriptor['id']>>] extends [never]
      ? { query?: GeneratedOperationQuery<Descriptor['id']> }
      : { query: GeneratedOperationQuery<Descriptor['id']> };

type GeneratedBodyArguments<Descriptor extends GeneratedOperationDescriptor> =
  Descriptor['requestKind'] extends 'none'
    ? { body?: never }
    : Descriptor['requestRequired'] extends true
      ? { body: GeneratedOperationRequest<Descriptor['id']> }
      : { body?: GeneratedOperationRequest<Descriptor['id']> };

export type GeneratedOperationConfig = Pick<
  AxiosRequestConfig,
  (typeof SAFE_CONFIG_KEYS)[number]
>;

export type GeneratedOperationArguments<Descriptor extends GeneratedOperationDescriptor> =
  GeneratedPathArguments<Descriptor>
  & GeneratedQueryArguments<Descriptor>
  & GeneratedBodyArguments<Descriptor>
  & { config?: GeneratedOperationConfig };

export type GeneratedMultipartDescriptor = GeneratedOperationDescriptor<
  GeneratedOperationId,
  'multipart',
  GeneratedResponseKind,
  boolean
>;

export type GeneratedMultipartOperationArguments<Descriptor extends GeneratedMultipartDescriptor> =
  GeneratedPathArguments<Descriptor>
  & GeneratedQueryArguments<Descriptor>
  & { body: GeneratedMultipartLogicalRequest<Descriptor>; config?: GeneratedOperationConfig };

function throwGeneratedOperationConfigOverride(): never {
  throw new Error('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
}

function snapshotHeaderGroup(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('생성 API 요청 설정이 유효하지 않습니다.');
  }

  const snapshot: Record<string, unknown> = {};
  for (const name of Object.keys(value)) {
    if (name.trim().toLowerCase() === 'content-type') throwGeneratedOperationConfigOverride();
    snapshot[name] = (value as Record<string, unknown>)[name];
  }
  return snapshot;
}

function snapshotGeneratedOperationHeaders(value: unknown): AxiosRequestConfig['headers'] {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('생성 API 요청 설정이 유효하지 않습니다.');
  }

  const headerBag = value as Record<string, unknown> & { has?: (name: string) => boolean };
  const hasHeader = headerBag.has;
  if (typeof hasHeader === 'function' && hasHeader.call(headerBag, 'Content-Type')) {
    throwGeneratedOperationConfigOverride();
  }

  const snapshot: Record<string, unknown> = {};
  for (const name of Object.keys(headerBag)) {
    const normalizedName = name.trim().toLowerCase();
    if (normalizedName === 'content-type') throwGeneratedOperationConfigOverride();
    const headerValue = headerBag[name];
    snapshot[name] = AXIOS_HEADER_GROUPS.has(normalizedName)
      ? snapshotHeaderGroup(headerValue)
      : headerValue;
  }
  return snapshot as AxiosRequestConfig['headers'];
}

export function validateGeneratedOperationConfig(value: unknown): GeneratedOperationConfig | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('생성 API 요청 설정이 유효하지 않습니다.');
  }
  const config = value as Record<string, unknown>;
  const safeConfig: Record<string, unknown> = {};
  for (const key of Object.keys(config)) {
    if (!SAFE_CONFIG_KEY_SET.has(key)) {
      throwGeneratedOperationConfigOverride();
    }
    const configValue = config[key];
    safeConfig[key] = key === 'headers'
      ? snapshotGeneratedOperationHeaders(configValue)
      : configValue;
  }
  return safeConfig as GeneratedOperationConfig;
}

function containsForbiddenPath(value: unknown, path: readonly string[], offset = 0): boolean {
  if (offset >= path.length) return true;
  const segment = path[offset];
  if (segment === '*') {
    return Array.isArray(value)
      && value.some((item) => containsForbiddenPath(item, path, offset + 1));
  }
  if (typeof value !== 'object' || value === null || !Object.hasOwn(value, segment)) return false;
  return containsForbiddenPath((value as Record<string, unknown>)[segment], path, offset + 1);
}

function assertForbiddenPathsAbsent(
  value: unknown,
  paths: readonly (readonly string[])[],
  boundary: '요청' | '응답',
): void {
  if (paths.some((path) => containsForbiddenPath(value, path))) {
    throw new Error(`생성 API ${boundary}에 허용되지 않은 필드가 있습니다.`);
  }
}

export function buildGeneratedOperationPath<Descriptor extends GeneratedOperationDescriptor>(
  descriptor: Descriptor,
  pathParameters: GeneratedOperationPath<Descriptor['id']>,
): string {
  if (!descriptor.path.startsWith(API_PREFIX)) {
    throw new Error('생성 API 경로가 표준 prefix를 벗어났습니다.');
  }

  const parameters = (parseGeneratedOperationPath(descriptor, pathParameters) ?? {}) as Record<string, unknown>;
  const usedParameters = new Set<string>();
  const resolvedPath = descriptor.path.replace(PATH_PARAMETER_PATTERN, (_placeholder, parameterName: string) => {
    const value = parameters[parameterName];
    if (value === undefined || value === null) {
      throw new Error('생성 API 경로 파라미터가 누락되었습니다.');
    }
    usedParameters.add(parameterName);
    return encodeURIComponent(String(value));
  });

  if (Object.keys(parameters).some((parameterName) => !usedParameters.has(parameterName))) {
    throw new Error('생성 API 경로에 선언되지 않은 파라미터가 있습니다.');
  }

  return resolvedPath.slice(API_PREFIX.length);
}

export function parseGeneratedOperationPath<Descriptor extends GeneratedOperationDescriptor>(
  descriptor: Descriptor,
  value: unknown,
): GeneratedOperationPath<Descriptor['id']> {
  if (!descriptor.pathSchema) {
    if (value !== undefined && (typeof value !== 'object' || value === null || Object.keys(value).length > 0)) {
      throw new Error('경로 파라미터가 없는 생성 API에 값이 전달되었습니다.');
    }
    return undefined as GeneratedOperationPath<Descriptor['id']>;
  }
  try {
    return descriptor.pathSchema.parse(value) as GeneratedOperationPath<Descriptor['id']>;
  } catch {
    throw new Error('생성 API 경로 파라미터가 OpenAPI 계약과 일치하지 않습니다.');
  }
}

export function parseGeneratedOperationQuery<Descriptor extends GeneratedOperationDescriptor>(
  descriptor: Descriptor,
  value: unknown,
): GeneratedOperationQuery<Descriptor['id']> {
  if (!descriptor.querySchema) {
    if (value !== undefined && (typeof value !== 'object' || value === null || Object.keys(value).length > 0)) {
      throw new Error('쿼리 파라미터가 없는 생성 API에 값이 전달되었습니다.');
    }
    return undefined as GeneratedOperationQuery<Descriptor['id']>;
  }
  try {
    return descriptor.querySchema.parse(value ?? {}) as GeneratedOperationQuery<Descriptor['id']>;
  } catch {
    throw new Error('생성 API 쿼리 파라미터가 OpenAPI 계약과 일치하지 않습니다.');
  }
}

export function parseGeneratedOperationRequest<Descriptor extends GeneratedOperationDescriptor>(
  descriptor: Descriptor,
  value: unknown,
): GeneratedOperationRequest<Descriptor['id']> {
  if (descriptor.requestKind === 'none') {
    if (value !== undefined) throw new Error('본문이 없는 생성 API에 요청 본문이 전달되었습니다.');
    return undefined as GeneratedOperationRequest<Descriptor['id']>;
  }
  if (value === undefined && !descriptor.requestRequired) {
    return undefined as GeneratedOperationRequest<Descriptor['id']>;
  }
  if (!descriptor.requestSchema) {
    throw new Error('생성 API 요청 스키마가 누락되었습니다.');
  }
  assertForbiddenPathsAbsent(value, descriptor.requestForbiddenPaths, '요청');
  try {
    return descriptor.requestSchema.parse(value) as GeneratedOperationRequest<Descriptor['id']>;
  } catch {
    throw new Error('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
  }
}

export function parseGeneratedOperationResponse<Descriptor extends GeneratedOperationDescriptor>(
  descriptor: Descriptor,
  value: unknown,
): GeneratedOperationResponse<Descriptor> {
  if (descriptor.responseKind === 'binary') {
    if (typeof Blob === 'undefined' || !(value instanceof Blob)) {
      throw new Error('생성 API binary 응답이 Blob 계약과 일치하지 않습니다.');
    }
    return value as GeneratedOperationResponse<Descriptor>;
  }

  const envelope = successfulEnvelopeSchema.safeParse(value);
  if (!envelope.success) {
    throw new Error('생성 API 응답 envelope가 성공 계약과 일치하지 않습니다.');
  }
  if (descriptor.responseKind === 'void') {
    if (!descriptor.envelopeSchema) {
      throw new Error('생성 API void 응답이 OpenAPI 계약과 일치하지 않습니다.');
    }
    try {
      const { data, ...metadata } = envelope.data;
      if (data !== null && data !== undefined) {
        throw new Error('void data must be empty');
      }
      // springdoc의 ApiResponse<Void> schema는 data를 object로 표현하므로 data의
      // null 여부는 위에서 직접 검증하고, 나머지 envelope 필드는 generated Zod로 검증한다.
      descriptor.envelopeSchema.parse(metadata);
    } catch {
      throw new Error('생성 API void 응답이 OpenAPI 계약과 일치하지 않습니다.');
    }
    return undefined as GeneratedOperationResponse<Descriptor>;
  }
  if (!descriptor.responseSchema || !descriptor.envelopeSchema) {
    throw new Error('생성 API 응답 스키마가 누락되었습니다.');
  }
  assertForbiddenPathsAbsent(
    envelope.data.data,
    descriptor.responseForbiddenPaths,
    '응답',
  );
  try {
    descriptor.envelopeSchema.parse(value);
    descriptor.responseSchema.parse(envelope.data.data);
    return envelope.data.data as GeneratedOperationResponse<Descriptor>;
  } catch {
    throw new Error('생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.');
  }
}
