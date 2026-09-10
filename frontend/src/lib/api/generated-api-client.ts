import type { AxiosRequestConfig } from 'axios';

import client from '@/lib/api/client';
import {
  buildGeneratedOperationPath,
  parseGeneratedOperationQuery,
  parseGeneratedOperationRequest,
  parseGeneratedOperationResponse,
  validateGeneratedOperationConfig,
  type GeneratedMultipartDescriptor,
  type GeneratedMultipartOperationArguments,
  type GeneratedOperationArguments,
} from '@/lib/api/generated-operation';
import type {
  GeneratedOperationDescriptor,
  GeneratedOperationResponse,
} from '@/types/generated-operations';

function buildGeneratedMultipartBody<Descriptor extends GeneratedMultipartDescriptor>(
  descriptor: Descriptor,
  value: unknown,
): FormData {
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('생성 API multipart transport를 현재 런타임에서 사용할 수 없습니다.');
  }
  if (!descriptor.multipartParts || descriptor.multipartParts.length === 0) {
    throw new Error('생성 API multipart part metadata가 누락되었습니다.');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseGeneratedOperationRequest(descriptor, value) as unknown as Record<string, unknown>;
  } catch {
    throw new Error('생성 API multipart 요청이 OpenAPI part 계약과 일치하지 않습니다.');
  }

  const formData = new FormData();
  try {
    for (const part of descriptor.multipartParts) {
      const partValue = parsed[part.name];
      if (partValue === undefined) continue;
      const values = part.multiple ? partValue as readonly unknown[] : [partValue];
      for (const item of values) {
        if (part.schemaRef !== null) {
          const json = JSON.stringify(item);
          if (json === undefined) throw new Error('JSON part 직렬화 결과가 없습니다.');
          formData.append(
            part.name,
            new Blob([json], { type: part.mediaType }),
          );
        } else {
          formData.append(part.name, item as Blob);
        }
      }
    }
  } catch {
    throw new Error('생성 API multipart 요청을 wire part로 직렬화할 수 없습니다.');
  }
  return formData;
}

export async function executeGeneratedOperation<const Descriptor extends GeneratedOperationDescriptor>(
  descriptor: Descriptor,
  args: GeneratedOperationArguments<Descriptor>,
): Promise<GeneratedOperationResponse<Descriptor>> {
  const runtimeArgs = args as unknown as {
    path?: unknown;
    query?: unknown;
    body?: unknown;
    config?: unknown;
  };
  const url = buildGeneratedOperationPath(descriptor, runtimeArgs.path as never);
  const query = parseGeneratedOperationQuery(descriptor, runtimeArgs.query);
  const body = parseGeneratedOperationRequest(descriptor, runtimeArgs.body);
  const suppliedConfig = validateGeneratedOperationConfig(runtimeArgs.config);

  if (descriptor.requestKind === 'multipart') {
    throw new Error('생성 API multipart 요청은 전용 adapter가 필요합니다.');
  }

  let rawResponse: unknown;
  if (descriptor.method === 'get') {
    const getConfig: AxiosRequestConfig = { ...suppliedConfig };
    if (query !== undefined) getConfig.params = query;
    if (descriptor.responseKind === 'binary') getConfig.responseType = 'blob';
    rawResponse = await client.getRaw(
      url,
      Object.keys(getConfig).length === 0 ? undefined : getConfig,
    );
  } else {
    const requestConfig: AxiosRequestConfig = {
      ...suppliedConfig,
      url,
      method: descriptor.method,
    };
    if (query !== undefined) requestConfig.params = query;
    if (descriptor.requestKind !== 'none') requestConfig.data = body;
    if (descriptor.responseKind === 'binary') requestConfig.responseType = 'blob';
    rawResponse = await client.requestRaw(requestConfig);
  }

  return parseGeneratedOperationResponse(descriptor, rawResponse);
}

/** Server-side GET transport for proxy authorization checks. Contract owns path/method/response. */
export async function executeGeneratedFetchOperation<const Descriptor extends GeneratedOperationDescriptor>(
  descriptor: Descriptor,
  args: GeneratedOperationArguments<Descriptor>,
  transport: { baseUrl: string; headers?: HeadersInit; signal?: AbortSignal },
): Promise<GeneratedOperationResponse<Descriptor>> {
  if (descriptor.method !== 'get' || descriptor.requestKind !== 'none' || descriptor.responseKind !== 'json') {
    throw new Error('서버 조회 transport는 생성 JSON GET 계약만 허용합니다.');
  }
  const runtimeArgs = args as unknown as { path?: unknown; query?: unknown; body?: unknown; config?: unknown };
  if (runtimeArgs.config !== undefined || runtimeArgs.body !== undefined) throw new Error('조회 계약을 호출부에서 덮어쓸 수 없습니다.');
  const baseUrl = new URL(`${transport.baseUrl.replace(/\/$/, '')}/`);
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new Error('유효한 서버 API 주소가 필요합니다.');
  const target = new URL(buildGeneratedOperationPath(descriptor, runtimeArgs.path as never), baseUrl);
  const query = parseGeneratedOperationQuery(descriptor, runtimeArgs.query);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) target.searchParams.append(key, String(item));
  }
  const response = await fetch(target.toString(), { method: 'GET', headers: transport.headers, signal: transport.signal, cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error('현재 서버 권한을 조회하지 못했습니다.');
  return parseGeneratedOperationResponse(descriptor, await response.json());
}

export async function executeGeneratedMultipartOperation<
  const Descriptor extends GeneratedMultipartDescriptor,
>(
  descriptor: Descriptor,
  args: GeneratedMultipartOperationArguments<Descriptor>,
): Promise<GeneratedOperationResponse<Descriptor>> {
  if (descriptor.requestKind !== 'multipart') {
    throw new Error('생성 API multipart descriptor가 아닙니다.');
  }

  const url = buildGeneratedOperationPath(descriptor, args.path as never);
  const query = parseGeneratedOperationQuery(descriptor, args.query);
  const suppliedConfig = validateGeneratedOperationConfig(args.config);
  const body = buildGeneratedMultipartBody(descriptor, args.body);

  const requestConfig: AxiosRequestConfig = {
    ...suppliedConfig,
    url,
    method: descriptor.method,
    data: body,
    // 공용 Axios instance의 application/json default를 마스킹해야 FormData가 JSON으로
    // 직렬화되지 않고 browser/Node adapter가 각 환경의 실제 boundary를 생성한다.
    headers: {
      ...suppliedConfig?.headers,
      'Content-Type': undefined,
    },
  };
  if (query !== undefined) requestConfig.params = query;
  const rawResponse = await client.requestRaw(requestConfig);
  return parseGeneratedOperationResponse(descriptor, rawResponse);
}
