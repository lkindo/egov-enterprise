import { z } from 'zod';

/*
  [2026-10-23 ADR-0040 결정 5·6] 상단 고정 상한·기본 일수 입력 검사 — 운영 화면 설정 탭과 게시판 만들기 마법사가 함께 쓴다.
  범위는 서버 @Min·@Max 가 생성 스키마로 내려온 값을 그대로 쓰고 화면 상수를 두지 않는다. 화면은 같은 범위에 한국어 사유만 붙인다.
*/

/** 생성 스키마의 숫자 범위. 생성 스키마에 한쪽 경계가 없으면 그 경계도 두지 않는다. */
export function generatedRange(generated: z.ZodNumber): { min: number | null; max: number | null } {
  return { min: generated.minValue, max: generated.maxValue };
}

/**
 * 상한·기본 일수 칸의 검사 스키마. 조사가 이름마다 달라(상한을·일수를) 주어·목적어 꼴을 함께 받는다.
 *
 * @param generated 생성 요청 스키마의 그 필드(optional 을 벗긴 숫자 스키마)
 */
export function pinCountSchema(name: { subject: string; object: string }, unit: string, generated: z.ZodNumber): z.ZodNumber {
  const { min, max } = generatedRange(generated);
  let schema = z.number({ message: `${name.object} 숫자로 입력해 주세요.` }).int(`${name.subject} 정수여야 합니다.`);
  if (min !== null) schema = schema.min(min, `${name.subject} ${min.toLocaleString()}${unit} 이상이어야 합니다.`);
  if (max !== null) schema = schema.max(max, `${name.subject} ${max.toLocaleString()}${unit}까지 정할 수 있습니다.`);
  return schema;
}
