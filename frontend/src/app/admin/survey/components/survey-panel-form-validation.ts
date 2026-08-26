import {
  SurveyArticleDtoSchema,
  SurveyQuestionDtoSchema,
  SurveyTemplateDtoSchema,
} from '@/types/generated-zod';

const positiveSurveyIdSchema = SurveyQuestionDtoSchema.shape.srvySn
  .unwrap()
  .int('설문 번호는 정수여야 합니다.')
  .positive('설문을 선택해 주세요.');

const positiveQuestionOrderSchema = SurveyQuestionDtoSchema.shape.qstnSn
  .unwrap()
  .int('문항 순번은 정수여야 합니다.')
  .positive('문항 순번을 확인해 주세요.');

const questionTypeSchema = SurveyQuestionDtoSchema.shape.qstnTypeCd
  .unwrap()
  .trim()
  .min(1, '문항 유형을 선택해 주세요.')
  .max(12, '문항 유형 코드는 최대 12자까지 입력할 수 있습니다.');

const questionContentSchema = SurveyQuestionDtoSchema.shape.qstnCn
  .unwrap()
  .trim()
  .min(1, '문항 내용을 입력해 주세요.')
  .max(4000, '문항 내용은 최대 4000자까지 입력할 수 있습니다.');

export const surveyQuestionCreateSchema = SurveyQuestionDtoSchema.pick({
  srvySn: true,
  qstnSn: true,
  qstnTypeCd: true,
  qstnCn: true,
}).extend({
  srvySn: positiveSurveyIdSchema,
  qstnSn: positiveQuestionOrderSchema,
  qstnTypeCd: questionTypeSchema,
  qstnCn: questionContentSchema,
});

const positiveQuestionIdSchema = SurveyArticleDtoSchema.shape.srvyQstnSn
  .unwrap()
  .int('문항 번호는 정수여야 합니다.')
  .positive('문항 번호를 확인해 주세요.');

const itemSurveyIdSchema = SurveyArticleDtoSchema.shape.srvySn
  .unwrap()
  .int('설문 번호는 정수여야 합니다.')
  .positive('설문을 선택해 주세요.');

const itemContentSchema = SurveyArticleDtoSchema.shape.artclCn
  .unwrap()
  .trim()
  .min(1, '항목 내용을 입력해 주세요.')
  .max(4000, '항목 내용은 최대 4000자까지 입력할 수 있습니다.');

export const surveyItemCreateSchema = SurveyArticleDtoSchema.pick({
  srvyQstnSn: true,
  srvySn: true,
  artclCn: true,
}).extend({
  srvyQstnSn: positiveQuestionIdSchema,
  srvySn: itemSurveyIdSchema,
  artclCn: itemContentSchema,
});

const templateTypeSchema = SurveyTemplateDtoSchema.shape.srvyTmpltTypeCd
  .unwrap()
  .trim()
  .min(1, '템플릿 유형 코드를 입력해 주세요.')
  .max(12, '템플릿 유형 코드는 최대 12자까지 입력할 수 있습니다.');

const templateExplanationSchema = SurveyTemplateDtoSchema.shape.srvyTmpltExpln
  .unwrap()
  .trim()
  .max(4000, '템플릿 설명은 최대 4000자까지 입력할 수 있습니다.');

export const surveyTemplateCreateSchema = SurveyTemplateDtoSchema.pick({
  srvyTmpltTypeCd: true,
  srvyTmpltExpln: true,
}).extend({
  srvyTmpltTypeCd: templateTypeSchema,
  srvyTmpltExpln: templateExplanationSchema,
});

export const surveyQuestionValidationLabels = {
  qstnCn: '문항 내용',
  qstnSn: '문항 순번',
  qstnTypeCd: '문항 유형',
  srvySn: '설문',
};

export const surveyItemValidationLabels = {
  artclCn: '항목 내용',
  srvyQstnSn: '문항',
  srvySn: '설문',
};

export const surveyTemplateValidationLabels = {
  srvyTmpltExpln: '템플릿 설명',
  srvyTmpltTypeCd: '템플릿 유형 코드',
};

