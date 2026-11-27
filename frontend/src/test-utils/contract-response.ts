import { HttpResponse } from 'msw';
import { parseGeneratedOperationResponse } from '@/lib/api/generated-operation';
import type { GeneratedOperationDescriptor } from '@/types/generated-operations';

/**
 * MSW 성공 응답 고정물을 생성 응답 계약(OpenAPI → generated-operations)으로 검사해 돌려준다(2026-11-27, 품질 평가 A안 4번).
 *
 * 손으로 쓴 고정물은 서버 계약이 바뀌어도 조용히 남아, 화면 시험이 존재하지 않는 응답 모양으로 초록이 된다. 이 도우미는 운영 코드가
 * 응답을 읽을 때 쓰는 {@link parseGeneratedOperationResponse} 와 같은 판정으로 고정물을 먼저 읽어 보고, 어긋나면 처리기가 불릴 때
 * 어느 필드가 어긋났는지 밝혀 던진다. 성공 envelope(`success`·`code`·`message`)는 도우미가 채운다.
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

/** 고정물(envelope 째)을 생성 응답 계약으로 읽는다. 어긋나면 operation 과 어긋난 필드 경로를 밝혀 던진다. */
export function assertContractFixture(operation: GeneratedOperationDescriptor, body: unknown): void {
  try {
    parseGeneratedOperationResponse(operation, body);
  } catch (error) {
    const data = body !== null && typeof body === 'object' ? (body as { data?: unknown }).data : undefined;
    const issues = operation.responseSchema?.safeParse(data);
    const detail = issues && !issues.success
      ? issues.error.issues.slice(0, 5).map((issue) => `${issue.path.join('.') || '(data)'}: ${issue.message}`).join('; ')
      : (error instanceof Error ? error.message : String(error));
    throw new Error(`MSW 고정물이 생성 응답 계약 ${operation.id} 와 어긋난다 — ${detail}`);
  }
}
