import type {
  GeneratedOperationDescriptor,
  GeneratedOperationResponse,
} from '@/types/generated-operations';
import {
  type GeneratedMultipartDescriptor,
  type GeneratedMultipartOperationArguments,
  type GeneratedOperationArguments,
} from '@/lib/api/generated-operation';
import {
  executeGeneratedMultipartOperation,
  executeGeneratedOperation,
} from '@/lib/api/generated-api-client';

/**
 * 생성된 operation 계약을 실행하는 API 서비스 기반 클래스.
 * HTTP method와 경로는 각 operation descriptor가 소유한다.
 */
export abstract class ApiService {
  /**
   * OpenAPI operationId에서 생성한 method/path/request/response 계약을 한 번에 실행한다.
   */
  protected async executeGenerated<const Descriptor extends GeneratedOperationDescriptor>(
    descriptor: Descriptor,
    args: GeneratedOperationArguments<Descriptor>,
  ): Promise<GeneratedOperationResponse<Descriptor>> {
    return executeGeneratedOperation(descriptor, args);
  }

  /** Multipart bytes는 FormData가, method/path/JSON 응답은 generated descriptor가 소유한다. */
  protected async executeGeneratedMultipart<const Descriptor extends GeneratedMultipartDescriptor>(
    descriptor: Descriptor,
    args: GeneratedMultipartOperationArguments<Descriptor>,
  ): Promise<GeneratedOperationResponse<Descriptor>> {
    return executeGeneratedMultipartOperation(descriptor, args);
  }
}

/**
 * 사용자용 서비스 클래스
 */
export abstract class UserService extends ApiService {}

/**
 * 관리자용 서비스 클래스
 */
export abstract class AdminService extends ApiService {}
