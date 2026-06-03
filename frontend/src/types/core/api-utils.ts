/**
 * Generated API Types Utility
 *
 * openapi-typescript濡님앹꽦님types/generated-api.d.ts瑜湲곕컲?쇰줈
 * API 요청/?묐떟 낆쓣 媛꾧껐?섍쾶 추출?섏뿬 ъ슜?섎뒗 헬퍼입니다
 */

import { paths, components } from '../generated-api';

/**
 * 특정 엔드포인트의 ?묐떟 데이터낆쓣 추출합니다
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
 * 특정 엔드포인트의 요청 데이터Body) 낆쓣 추출합니다
 */
export type ApiRequestBody<
 Path extends keyof paths,
 Method extends keyof paths[Path] & string
> = paths[Path][Method] extends { requestBody: { content: { 'application/json': infer T } } }
 ? T
 : never;

/**
 * 스키마컴포넌트(DTO)瑜직접 참조합니다
 */
export type SchemaDTO<Name extends keyof components['schemas']> = components['schemas'][Name];
