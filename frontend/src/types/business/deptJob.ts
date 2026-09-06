import type { z } from 'zod';
import {
  DeptJobBoxDtoRequestSchema,
  DeptJobBoxDtoResponseSchema,
  DeptJobDtoRequestSchema,
  DeptJobDtoResponseSchema,
} from '@/types/generated-zod';

/** 부서 업무 등록·수정 입력은 서버 소유 필드를 제외한 생성 요청 계약을 따른다. */
export type DeptJobInput = z.input<typeof DeptJobDtoRequestSchema>;

/** 상세·목록에서 사용하는 부서 업무 응답. 라우팅 가능한 조회 결과에는 식별자가 존재한다. */
export type DeptJobVO = z.output<typeof DeptJobDtoResponseSchema> & { deptTaskSn: number };

/** 부서 업무함 등록·수정 입력은 서버 소유 필드를 제외한 생성 요청 계약을 따른다. */
export type DeptJobBoxInput = z.input<typeof DeptJobBoxDtoRequestSchema>;

/** 상세·목록에서 사용하는 부서 업무함 응답. 선택 가능한 조회 결과에는 식별자가 존재한다. */
export type DeptJobBxVO = z.output<typeof DeptJobBoxDtoResponseSchema> & { deptTaskBoxSn: number };

