import { HttpResponse } from 'msw';
import { parseGeneratedOperationResponse } from '@/lib/api/generated-operation';
import type { GeneratedOperationDescriptor } from '@/types/generated-operations';

/**
 * MSW 성공 응답 고정물을 생성 응답 계약(OpenAPI → generated-operations)으로 검사해 돌려준다(2026-11-27, 품질 평가 A안 4번).
 *
 * 손으로 쓴 고정물은 서버 계약이 바뀌어도 조용히 남아, 화면 시험이 존재하지 않는 응답 모양으로 초록이 된다. 이 도우미는 운영 코드가
 * 응답을 읽을 때 쓰는 {@link parseGeneratedOperationResponse} 와 같은 판정으로 고정물을 먼저 읽어 보고, 계약에 없는 키(선택 필드의
 * 오타·옛 키)도 어긋남으로 본다. 성공 envelope(`success`·`code`·`message`)는 도우미가 채운다.
 *
 * <p>어긋나면 두 번 알린다 — 처리기 안에서 던지고(MSW 는 이것을 HTTP 500 으로 바꾼다), 위반을 기록해 시험이 끝날 때 실패로 올린다
 * (vitest.setup.ts 의 {@link assertNoContractViolations}). 앱 코드가 500 을 빈 목록처럼 삼켜도 시험은 붉어진다. 위반을 일부러 일으키는
 * 시험은 {@link takeContractViolations} 로 비운다.
 *
 * <p>실패 응답(`success: false`·4xx/5xx)은 성공 계약 밖이라 이 도우미를 쓰지 않는다. 생성 프로젝트에서 빠질 수 있는 기능의 operation 은
 * 그 기능 소유 경로의 처리기·시험에서만 쓴다 — 공용 처리기(src/mocks/handlers.ts)가 import 하면 그 기능을 뺀 생성물의 타입 검사가 깨진다.
 *
 * <p>{@code data} 의 형식은 실행 중 생성 응답 스키마(zod)가 판정한다. TS 응답 타입(GeneratedOperationResponse)은 OpenAPI 타입에서 와서
 * 요청용 필수 필드까지 담기도 한다(예: getMe 의 `pswd`) — 응답 고정물을 그 타입으로 묶으면 실제로 오지 않는 필드를 강요한다.
 */
export function contractJson(operation: GeneratedOperationDescriptor, data?: unknown, init?: ResponseInit) {
  const body = { success: true, code: 'S000', message: '성공', ...(data === undefined ? {} : { data }) };
  assertContractFixture(operation, body);
  return HttpResponse.json(body, init);
}

const violations: string[] = [];

/** 기록된 계약 위반을 비우며 돌려준다. */
export function takeContractViolations(): string[] {
  return violations.splice(0);
}

/** 기록된 계약 위반이 있으면 던진다 — 시험이 끝날 때 부른다(vitest.setup.ts). */
export function assertNoContractViolations(): void {
  const seen = takeContractViolations();
  if (seen.length > 0) throw new Error(`MSW 고정물 계약 위반: ${seen.join(' | ')}`);
}

/** 고정물(envelope 째)을 생성 응답 계약으로 읽는다. 어긋나면 operation 과 어긋난 자리를 밝혀 기록하고 던진다. */
export function assertContractFixture(operation: GeneratedOperationDescriptor, body: unknown): void {
  const problem = contractProblem(operation, body);
  if (problem === null) return;
  const source = (globalThis as { expect?: { getState?: () => { currentTestName?: string } } }).expect?.getState?.().currentTestName;
  const message = `MSW 고정물이 생성 응답 계약 ${operation.id} 와 어긋난다 — ${problem}`;
  violations.push(source ? `${message} (시험: ${source})` : message);
  throw new Error(message);
}

function contractProblem(operation: GeneratedOperationDescriptor, body: unknown): string | null {
  const envelope = body !== null && typeof body === 'object' ? body as Record<string, unknown> : null;
  if (!envelope || envelope.success !== true || typeof envelope.code !== 'string' || typeof envelope.message !== 'string') {
    return 'envelope: 성공 envelope(success: true·code·message)가 아니다';
  }
  try {
    parseGeneratedOperationResponse(operation, body);
  } catch (error) {
    const issues = operation.responseSchema?.safeParse(envelope.data);
    return issues && !issues.success
      ? issues.error.issues.slice(0, 5).map((issue) => `${issue.path.join('.') || '(data)'}: ${issue.message}`).join('; ')
      : (error instanceof Error ? error.message : String(error));
  }
  if (operation.responseKind !== 'json' || !operation.responseSchema) return null;
  // 운영 zod 는 계약에 없는 키를 통과시킨다(읽을 때 버린다) — 고정물에 그런 키가 있으면 선택 필드의 오타·옛 키가 조용히 남는다.
  const unknown = undeclaredKeys(envelope.data, operation.responseSchema.parse(envelope.data), '');
  return unknown.length > 0 ? `계약에 없는 키: ${unknown.slice(0, 5).join(', ')}` : null;
}

/** 입력에는 있는데 스키마가 읽어 낸 값에는 없는 키의 경로(스키마가 버린 키). */
function undeclaredKeys(input: unknown, parsed: unknown, path: string): string[] {
  if (Array.isArray(input) && Array.isArray(parsed)) {
    return input.flatMap((item, index) => undeclaredKeys(item, parsed[index], `${path}[${index}]`));
  }
  if (!isPlainObject(input) || !isPlainObject(parsed)) return [];
  return Object.keys(input).flatMap((key) => {
    const child = path ? `${path}.${key}` : key;
    return key in parsed ? undeclaredKeys(input[key], parsed[key], child) : [child];
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}
