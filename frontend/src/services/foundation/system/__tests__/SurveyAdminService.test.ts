/**
 * SurveyAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/SurveyAdminService.ts` 는 설문(surveys)·템플릿(templates)·
 * 응답자(respondents)·문항(questions)·항목(items) **5종 자원**을 한 클래스로 다루는
 * 관리자 API 의 유일한 진입점인데도 커버리지 0% 였다. 로직이 얇아 "테스트할 게 없다"고
 * 보이지만, 아래 항목들은 **틀어져도 컴파일·타입 검사를 모두 통과한 채 런타임에서만 조용히
 * 깨진다** — 화면에는 "조회 실패" 토스트 한 줄만 뜬다.
 *
 * 1) URL 조합 — `AdminService('/surveys')` 는 `ApiService` 에서 선행 슬래시가 제거되고
 *    `admin/{category}/` 접두가 붙어 최종 `admin/system/surveys` 가 된다(category 기본값 'system').
 *    이 파일의 서비스들은 접두를 스스로 쓰지 않으므로, 접두 규칙이나 생성자 인자가 한 글자만
 *    어긋나도 전 메서드가 동시에 404 가 된다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 에 맞춘다. 이 +1 이
 *    사라지거나 두 번 적용되면 목록이 한 페이지씩 밀리거나 첫 페이지가 빈다. 타입은 그대로라
 *    tsc 로는 절대 잡히지 않는다.
 *
 * 3) 검색어 승격 — 목록 3종(설문/템플릿/응답자)은 `searchKeyword || searchWrd || ''` 를
 *    `keyword` 로 승격해 보낸다. 이 폴백 순서가 뒤집히면 레거시 화면(searchWrd)이나 신규
 *    화면(searchKeyword) 중 한쪽의 검색이 통째로 무력화된다.
 *
 * 4) 경로 변수 치환 순서 — `updateQuestion(srvySn, srvyQstnSn, …)` 처럼 **숫자 인자 2개가
 *    연달아** 오는 메서드가 있다. 순서가 뒤바뀌어도 타입은 둘 다 number 라 통과하지만,
 *    실제로는 **다른 설문의 문항을 고치거나 지운다** — 되돌릴 수 없는 사고다.
 *    항목(items)은 더 위험하다: 생성은 `/questions/{sn}/items` 인데 수정·삭제는
 *    `/questions/items/{sn}` 로 **문법이 다르다**. 헷갈려서 통일하면 엉뚱한 자원을 건드린다.
 *
 * 5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal)가 유실되면
 *    화면 이탈 시 요청 취소가 동작하지 않고 타임아웃이 기본값으로 되돌아간다. 유실돼도
 *    요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';
import type { Survey, SurveyAnswer, SurveyQuestion } from '@/types/business/survey';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => {
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const remove = vi.fn();
  const fallbackData = (url: string) => {
    if (url.endsWith('/questions')) return [];
    if (url === 'admin/system/surveys' || url.endsWith('/templates') || url.endsWith('/respondents')) {
      return { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
    }
    return { srvyTtl: '설문', srvyTmpltSn: 1 };
  };

  return {
    get,
    post,
    put,
    delete: remove,
    getRaw: vi.fn(async (url: string, config?: unknown) => {
      const result = await get(url, config);
      return {
        success: true,
        code: 'S000',
        message: '성공',
        data: result ?? fallbackData(url),
      };
    }),
    requestRaw: vi.fn(async (request: Record<string, unknown>) => {
      const { url, method, data, ...rest } = request;
      delete rest.params;
      const config = Object.keys(rest).length > 0 ? rest : undefined;
      let result: unknown;

      if (method === 'post') result = await post(url, data, config);
      if (method === 'put') result = await put(url, data, config);
      if (method === 'delete') result = await remove(url, config);

      return { success: true, code: 'S000', message: '성공', data: result };
    }),
  };
});

vi.mock('@/lib/api/client', () => ({ default: client }));

import { surveyAdminService, type SurveyTemplate } from '../SurveyAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/surveys')` + category 기본값 'system' → `admin/system/surveys` (선행 슬래시 없음).
 */
const BASE = 'admin/system/surveys';

describe('SurveyAdminService — 설문 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  it('목록 조회는 공개 검색어를 OpenAPI query로 정규화한 raw envelope 경계를 사용한다', async () => {
    client.getRaw.mockResolvedValueOnce({
      success: true,
      code: 'S000',
      message: '성공',
      data: { list: [], total: 0, page: 0, size: 20, totalPage: 0 },
    });

    await surveyAdminService.getSurveyList({ pageIndex: 2, size: 20, searchWrd: '만족도' });

    expect(client.getRaw).toHaveBeenCalledWith('admin/system/surveys', {
      params: { keyword: '만족도', page: 1, size: 20 },
    });
  });

  it('일치하는 설문 하위 자원 호출은 모두 생성 operation 경계를 통과한다', async () => {
    const page = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
    const responses = [
      page,
      { srvySn: 7, srvyTtl: '설문', srvyTmpltSn: 3 },
      page,
      page,
      [],
    ];
    for (const data of responses) {
      client.getRaw.mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data });
    }
    for (let index = 0; index < 11; index += 1) {
      client.requestRaw.mockResolvedValueOnce({
        success: true,
        code: 'S000',
        message: '성공',
        data: undefined,
      });
    }

    await surveyAdminService.getSurveyList();
    await surveyAdminService.getSurvey(7);
    await surveyAdminService.getTemplateList();
    await surveyAdminService.getRespondents(7);
    await surveyAdminService.getQuestions(7);
    await surveyAdminService.updateSurvey(7, { srvyTtl: '수정', srvyTmpltSn: 3 });
    await surveyAdminService.deleteSurvey(7);
    await surveyAdminService.deleteRespondent(7, 'RSPDNT-0001');
    await surveyAdminService.createTemplate({ srvyTmpltTypeCd: '01' });
    await surveyAdminService.updateTemplate(3, { srvyTmpltExpln: '수정' });
    await surveyAdminService.deleteTemplate(3);
    await surveyAdminService.createQuestion(7, { qstnCn: '문항' });
    await surveyAdminService.updateQuestion(7, 55, { qstnCn: '수정 문항' });
    await surveyAdminService.createItem(55, { artclCn: '항목' });
    await surveyAdminService.updateItem(900, { artclCn: '수정 항목' });
    await surveyAdminService.deleteItem(900);

    expect(client.getRaw.mock.calls).toEqual([
      [BASE, { params: { keyword: '' } }],
      [`${BASE}/7`, undefined],
      [`${BASE}/templates`, { params: { keyword: '' } }],
      [`${BASE}/7/respondents`, { params: { keyword: '' } }],
      [`${BASE}/7/questions`, undefined],
    ]);
    expect(client.requestRaw.mock.calls.map(([request]) => ({
      url: request.url,
      method: request.method,
    }))).toEqual([
      { url: `${BASE}/7`, method: 'put' },
      { url: `${BASE}/7`, method: 'delete' },
      { url: `${BASE}/7/respondents/RSPDNT-0001`, method: 'delete' },
      { url: `${BASE}/templates`, method: 'post' },
      { url: `${BASE}/templates/3`, method: 'put' },
      { url: `${BASE}/templates/3`, method: 'delete' },
      { url: `${BASE}/7/questions`, method: 'post' },
      { url: `${BASE}/7/questions/55`, method: 'put' },
      { url: `${BASE}/questions/55/items`, method: 'post' },
      { url: `${BASE}/questions/items/900`, method: 'put' },
      { url: `${BASE}/questions/items/900`, method: 'delete' },
    ]);
  });

  describe('설문(surveys) CRUD', () => {
    it('설문 목록은 admin/system/surveys 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await surveyAdminService.getSurveyList();

      // params 를 안 넘겨도 keyword 는 빈 문자열로 항상 채워져 나간다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { keyword: '' } });
    });

    it('첫 페이지(page 0)는 OpenAPI의 0-based page 그대로 전송된다', async () => {
      await surveyAdminService.getSurveyList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { keyword: '', page: 0 },
      });
    });

    it('page 3·size 20 은 OpenAPI Pageable 키만 전송한다', async () => {
      await surveyAdminService.getSurveyList({ page: 3, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { keyword: '', page: 3, size: 20 },
      });
    });

    it('page와 pageIndex가 함께 오면 OpenAPI 고유 키인 page가 우선한다', async () => {
      await surveyAdminService.getSurveyList({ page: 9, pageIndex: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { keyword: '', page: 9 },
      });
    });

    it('searchKeyword 는 keyword 로 승격되어 백엔드 @RequestParam 에 도달한다', async () => {
      await surveyAdminService.getSurveyList({ searchKeyword: '만족도' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { keyword: '만족도' },
      });
    });

    it('searchKeyword 가 없으면 레거시 키 searchWrd 를 폴백으로 승격한다', async () => {
      await surveyAdminService.getSurveyList({ searchWrd: '레거시검색' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { keyword: '레거시검색' },
      });
    });

    it('두 검색 키가 함께 오면 searchKeyword 가 searchWrd 보다 우선한다', async () => {
      await surveyAdminService.getSurveyList({ searchKeyword: '우선', searchWrd: '후순위' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { keyword: '우선' },
      });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await surveyAdminService.getSurveyList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { keyword: '', page: 0 },
      });
    });

    it('호출부가 넘긴 params 객체는 변형되지 않는다 — 재사용 시 pageIndex 가 누적 오염되면 안 된다', async () => {
      // ApiService.get 은 넘겨받은 params 객체에 직접 pageIndex 를 써넣는다(파괴적).
      // 서비스가 스프레드로 사본을 만들기 때문에 호출부(React Query key 등)의 객체는 무사하다.
      const callerParams: SearchParams = { page: 1, size: 10 };

      await surveyAdminService.getSurveyList(callerParams);

      expect(callerParams).toEqual({ page: 1, size: 10 });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<Survey> = {
        list: [
          {
            srvySn: 7,
            srvyTtl: '고객 만족도 조사',
            srvyPrps: '서비스 개선',
            srvyWrtGdCn: '솔직하게 작성해 주세요',
            srvyTrgt: '전체 회원',
            srvyBgngYmd: '20260801',
            srvyEndYmd: '20260831',
            srvyTmpltSn: 3,
            crtDt: '2026-08-01T09:00:00',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(surveyAdminService.getSurveyList()).resolves.toBe(page);
    });

    it('설문 단건 조회는 srvySn 을 경로 변수로 붙이고 config 를 그대로 넘긴다', async () => {
      await surveyAdminService.getSurvey(7, { timeout: 1000 });

      // 단건 조회는 params 가 없으므로 페이징 정규화가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await surveyAdminService.getSurvey(7);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, undefined);
    });

    it('설문 등록은 컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      const payload: Partial<Survey> = {
        srvyTtl: '신규 설문',
        srvyPrps: '의견 수렴',
        srvyTmpltSn: 3,
      };

      await surveyAdminService.createSurvey(payload);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: BASE,
        method: 'post',
        data: payload,
      });
    });

    it('설문 수정은 인자로 받은 srvySn 이 경로를 결정한다 — 본문의 srvySn 이 아니다', async () => {
      // 본문에 다른 srvySn(99)을 심어 두고, 경로는 인자(7)만 따르는지 확인한다.
      const payload: Partial<Survey> = {
        srvySn: 99,
        srvyTtl: '제목만 수정',
        srvyTmpltSn: 3,
      };

      await surveyAdminService.updateSurvey(7, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/99`, payload, { timeout: 2000 });
    });

    it('설문 삭제는 지정한 srvySn 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await surveyAdminService.deleteSurvey(7);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });
  });

  describe('템플릿(templates)', () => {
    it('템플릿 목록은 surveys/templates 하위로 나가며 목록과 동일한 keyword·페이징 변환을 받는다', async () => {
      await surveyAdminService.getTemplateList({ page: 0, size: 50 });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/templates`, {
        params: { keyword: '', page: 0, size: 50 },
      });
    });

    it('템플릿 목록 조회에서도 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await surveyAdminService.getTemplateList({ searchKeyword: '기본형' }, { signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/templates`, {
        signal,
        params: { keyword: '기본형' },
      });
    });

    it('템플릿 생성은 templates 컬렉션에 본문을 그대로 POST 한다', async () => {
      // SurveyTemplate 은 백엔드 SurveyTemplateDto 를 SSOT 로 삼는다(Survey 와 필드가 겹치지 않는다).
      const payload: Partial<SurveyTemplate> = {
        srvyTmpltTypeCd: '01',
        srvyTmpltExpln: '기본 템플릿',
      };

      await surveyAdminService.createTemplate(payload);

      expect(client.post).toHaveBeenCalledWith(`${BASE}/templates`, payload, undefined);
    });

    it('템플릿 수정은 templates/{srvyTmpltSn} 으로 나간다 — 설문 경로(/{srvySn})와 섞이면 다른 자원을 고친다', async () => {
      const payload: Partial<SurveyTemplate> = { srvyTmpltExpln: '설명 변경' };

      await surveyAdminService.updateTemplate(3, payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/templates/3`, payload, undefined);
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/3`, payload, undefined);
    });

    it('템플릿 삭제도 templates/{srvyTmpltSn} 로만 DELETE 한다', async () => {
      await surveyAdminService.deleteTemplate(3);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/templates/3`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/3`, undefined);
    });
  });

  describe('응답자(respondents)', () => {
    it('응답자 목록은 설문 하위 경로(/{srvySn}/respondents)로만 조회된다 — 경로가 조회 범위를 강제한다', async () => {
      await surveyAdminService.getRespondents(7, {
        pageIndex: 2,
        size: 20,
        searchKeyword: '홍길동',
      });

      // pageIndex 를 직접 줬으므로 page 기반 +1 변환은 개입하지 않고, size 만 확장된다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/7/respondents`, {
        params: {
          keyword: '홍길동',
          page: 1,
          size: 20,
        },
      });
    });

    it('응답자 목록도 page 0 을 pageIndex 1 로 변환한다', async () => {
      await surveyAdminService.getRespondents(7, { page: 0 });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7/respondents`, {
        params: { keyword: '', page: 0 },
      });
    });

    it('params 없이 config 만 넘겨도 signal 이 보존되고 keyword 기본값이 채워진다', async () => {
      const { signal } = new AbortController();

      await surveyAdminService.getRespondents(7, undefined, { signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7/respondents`, {
        signal,
        params: { keyword: '' },
      });
    });

    it('응답자 삭제는 (srvySn, respondentId) 순서로 치환한다 — 뒤바뀌면 다른 설문의 응답자를 지운다', async () => {
      await surveyAdminService.deleteRespondent(7, 'RSPDNT-0001');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7/respondents/RSPDNT-0001`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/RSPDNT-0001/respondents/7`, undefined);
    });
  });

  describe('문항(questions)·항목(items)', () => {
    it('문항 목록은 /{srvySn}/questions 단 한 번만 호출한다 — 항목이 중첩돼 오므로 문항별 추가 조회는 없다', async () => {
      await surveyAdminService.getQuestions(7);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7/questions`, undefined);
      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it('문항 목록 응답은 배열 그대로(items 중첩 포함) 반환된다', async () => {
      const questions: SurveyQuestion[] = [
        {
          srvyQstnSn: 55,
          srvySn: 7,
          qstnSn: 1,
          qstnTypeCd: '1',
          qstnCn: '서비스에 만족하십니까?',
          maxChcCnt: 1,
          srvyTmpltSn: 3,
          frstRgtrId: 'admin',
          crtDt: '2026-08-01T09:00:00',
          items: [],
        },
      ];
      client.get.mockResolvedValueOnce(questions);

      await expect(surveyAdminService.getQuestions(7)).resolves.toBe(questions);
    });

    it('문항 생성은 설문 하위 컬렉션(/{srvySn}/questions)에 POST 한다', async () => {
      const payload: Partial<SurveyQuestion> = {
        srvySn: 7,
        qstnCn: '서비스에 만족하십니까?',
        qstnTypeCd: '1',
        maxChcCnt: 1,
      };

      await surveyAdminService.createQuestion(7, payload);

      expect(client.post).toHaveBeenCalledWith(`${BASE}/7/questions`, payload, undefined);
    });

    it('문항 수정은 (srvySn=7, srvyQstnSn=55) 순서로 치환한다 — 뒤바뀌면 다른 설문의 문항을 고친다', async () => {
      const payload: Partial<SurveyQuestion> = { qstnCn: '문항 내용 수정' };

      await surveyAdminService.updateQuestion(7, 55, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7/questions/55`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/55/questions/7`, payload, { timeout: 2000 });
    });

    it('문항 삭제도 (srvySn=7, srvyQstnSn=55) 순서를 지킨다', async () => {
      await surveyAdminService.deleteQuestion(7, 55);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: `${BASE}/7/questions/55`,
        method: 'delete',
      });
    });

    it('항목 생성은 설문이 아니라 문항 하위(/questions/{srvyQstnSn}/items)로 나간다', async () => {
      const payload: Partial<SurveyAnswer> = { srvyQstnSn: 55, srvySn: 7, artclCn: '매우 만족' };

      await surveyAdminService.createItem(55, payload);

      expect(client.post).toHaveBeenCalledWith(`${BASE}/questions/55/items`, payload, undefined);
      // 설문 하위로 잘못 내보내면 백엔드 라우팅이 성립하지 않는다.
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/55/items`, payload, undefined);
    });

    it('항목 수정은 /questions/items/{srvyArtclSn} 이다 — 생성 경로 문법(/questions/{sn}/items)과 다르다', async () => {
      const payload: Partial<SurveyAnswer> = { artclCn: '보통' };

      await surveyAdminService.updateItem(900, payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/questions/items/900`, payload, undefined);
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/questions/900/items`, payload, undefined);
    });

    it('항목 삭제도 /questions/items/{srvyArtclSn} 로만 DELETE 한다', async () => {
      await surveyAdminService.deleteItem(900);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/questions/items/900`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/questions/900/items`, undefined);
    });
  });

  describe('자원 간 경로 격리', () => {
    it('5종 자원의 조회 경로는 서로 겹치지 않는다 — 하나라도 겹치면 다른 자원을 조작하게 된다', async () => {
      await surveyAdminService.getSurveyList();
      await surveyAdminService.getTemplateList();
      await surveyAdminService.getRespondents(7);
      await surveyAdminService.getQuestions(7);

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/surveys',
        'admin/system/surveys/templates',
        'admin/system/surveys/7/respondents',
        'admin/system/surveys/7/questions',
      ]);
    });

    it('모든 요청 경로는 admin/system/surveys 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL 의 경로 세그먼트가 통째로 날아간다(절대 경로로 해석).
      await surveyAdminService.getSurvey(7);
      await surveyAdminService.createTemplate({ srvyTmpltTypeCd: '01' });
      await surveyAdminService.updateItem(900, { artclCn: '보통' });
      await surveyAdminService.deleteRespondent(7, 'RSPDNT-0001');

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(4);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });
});
