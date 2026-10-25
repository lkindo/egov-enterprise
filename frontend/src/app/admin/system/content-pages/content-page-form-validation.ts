import { z } from 'zod';

import {
  CmsPageCreateRequestRequestSchema,
  CmsPageDraftRequestRequestSchema,
  CmsPagePublishRequestRequestSchema,
} from '@/types/generated-zod';

/**
 * 콘텐츠 페이지 관리 화면의 입력 검증(ADR-0039). 생성 계약(generated zod)의 길이·형식에 화면 문구를 입힌다 — 서버 DTO 가 바뀌면
 * 생성 스키마를 따라 함께 바뀐다. 문서 구조는 이 폼이 아니라 문서 판정(lib/cms/document)이 맡는다.
 */
const titleSchema = CmsPageCreateRequestRequestSchema.shape.contsTtl
  .trim()
  .min(1, '페이지 제목을 입력해 주세요.')
  .max(256, '페이지 제목은 256자 이내로 입력해 주세요.');

const pathSchema = z.string()
  .trim()
  .min(1, '주소를 입력해 주세요.')
  .max(100, '주소는 100자 이내로 입력해 주세요.')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '주소는 영문 소문자·숫자·하이픈으로 입력해 주세요(예: service-guide).')
  .pipe(CmsPageCreateRequestRequestSchema.shape.contsPathNm);

export const contentPageCreateFormSchema = CmsPageCreateRequestRequestSchema
  .pick({ contsTtl: true, contsPathNm: true })
  .extend({ contsTtl: titleSchema, contsPathNm: pathSchema });

/**
 * 새 페이지 대화상자의 칸 이름. `copySource` 는 시작 양식 '기존 페이지 복사' 에서 고를 페이지다(ADR-0042) — 요청 본문의 칸이
 * 아니라 화면이 문서를 읽어 올 원본이라 스키마에 두지 않고, 대화상자가 고름 여부를 따로 판정해 같은 오류 요약에 싣는다.
 */
export const contentPageCreateValidationLabels = {
  contsTtl: '페이지 제목',
  contsPathNm: '주소',
  copySource: '복사할 페이지',
};

/** 초안 저장의 페이지 정보 칸. 본문 문서는 normalizeCmsDocument 가 따로 판정한다. */
export const contentPageDraftFormSchema = CmsPageDraftRequestRequestSchema
  .pick({ contsTtl: true, contsPathNm: true, contsExpln: true })
  .extend({
    contsTtl: titleSchema,
    contsPathNm: pathSchema,
    contsExpln: CmsPageDraftRequestRequestSchema.shape.contsExpln
      .unwrap()
      .trim()
      .max(4000, '요약은 4000자 이내로 입력해 주세요.'),
  });

export const contentPageDraftValidationLabels = {
  contsTtl: '페이지 제목',
  contsPathNm: '주소',
  contsExpln: '요약',
};

export const contentPagePublishFormSchema = CmsPagePublishRequestRequestSchema
  .pick({ rvsnRsn: true })
  .extend({
    rvsnRsn: CmsPagePublishRequestRequestSchema.shape.rvsnRsn
      .unwrap()
      .trim()
      .max(4000, '변경 설명은 4000자 이내로 입력해 주세요.'),
  });

export const contentPagePublishValidationLabels = {
  rvsnRsn: '변경 설명',
};

