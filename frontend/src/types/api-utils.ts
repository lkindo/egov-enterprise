/**
 * Generated API Types Utility
 *
 * openapi-typescript로 생성된 types/generated-api.d.ts를 기반으로
 * API 요청/응답 타입을 간결하게 추출하여 사용하는 헬퍼입니다.
 */

import { paths, components } from './generated-api';

/**
 * 특정 엔드포인트의 응답 데이터 타입을 추출합니다.
 * @example
 * type UserInfo = ApiResponseData<'/api/v1/users/{id}', 'get'>;
 */
export type ApiResponseData<
    Path extends keyof paths,
    Method extends keyof paths[Path] & string
> = paths[Path][Method] extends { responses: { 200: { content: { 'application/json': infer T } } } }
    ? T
    : never;

/**
 * 특정 엔드포인트의 요청 데이터(Body) 타입을 추출합니다.
 */
export type ApiRequestBody<
    Path extends keyof paths,
    Method extends keyof paths[Path] & string
> = paths[Path][Method] extends { requestBody: { content: { 'application/json': infer T } } }
    ? T
    : never;

/**
 * 스키마 컴포넌트(DTO)를 직접 참조합니다.
 */
export type SchemaDTO<Name extends keyof components['schemas']> = components['schemas'][Name];
