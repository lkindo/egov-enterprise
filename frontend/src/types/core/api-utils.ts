/**
 * Generated API Types Utility
 *
 * openapi-typescript濡님앹꽦님types/generated-api.d.ts瑜?湲곕컲?쇰줈
 * API 요청/?묐떟 ??낆쓣 媛꾧껐?섍쾶 異붿텧?섏뿬 ?ъ슜?섎뒗 ?ы띁?낅땲님
 */

import { paths, components } from '../generated/generated-api';

/**
 * ?뱀젙 ?붾뱶?ъ씤?몄쓽 ?묐떟 ?곗씠님??낆쓣 異붿텧?⑸땲님
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
 * ?뱀젙 ?붾뱶?ъ씤?몄쓽 요청 ?곗씠님Body) ??낆쓣 異붿텧?⑸땲님
 */
export type ApiRequestBody<
 Path extends keyof paths,
 Method extends keyof paths[Path] & string
> = paths[Path][Method] extends { requestBody: { content: { 'application/json': infer T } } }
 ? T
 : never;

/**
 * ?ㅽ궎留?而댄룷?뚰듃(DTO)瑜?吏곸젒 李몄“?⑸땲님
 */
export type SchemaDTO<Name extends keyof components['schemas']> = components['schemas'][Name];
