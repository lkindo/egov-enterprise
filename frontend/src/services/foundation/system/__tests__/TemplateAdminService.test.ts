/**
 * TemplateAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/TemplateAdminService.ts` 는 템플릿(게시판 블루프린트) 관리의
 * 유일한 API 진입점이며 `app/admin/community/templates` 화면 전체가 이 한 클래스에 물려 있다
 * (실측: page.tsx 의 SSR 프리페치 1곳 + TemplateAdminClient 의 새로고침·등록 2곳). 메서드가 3개뿐이고
 * 본문이 한 줄씩이라 "테스트할 게 없다"고 보이지만, 아래 항목들은 **틀어져도 컴파일·타입 검사를 모두
 * 통과한 채 런타임에서만 조용히 깨진다**.
 *
 * 1) URL 조합 — `AdminService('/templates')` 는 `ApiService` 생성자에서 선행 슬래시가 제거되고
 *    `admin/{category}/` 접두가 붙어 최종 `admin/system/templates` 가 된다(category 기본값 'system').
 *    이 서비스는 화면 경로가 `/admin/community/templates` 라 'community' 로 오인하기 쉽지만,
 *    생성자는 category 를 넘기지 않으므로 **실제 접두는 system 이다**(형제 CommunityAdminService 는
 *    반대로 'content' 를 명시한다). OpenAPI 실측 경로도 `/api/v1/admin/system/templates` 와
 *    `/api/v1/admin/system/templates/{tmpltId}` 로, 접두가 한 글자만 어긋나면 3개 메서드가 동시에
 *    404 가 된다. 선행 슬래시가 되살아나면 axios `baseURL`('/api/v1')의 경로 세그먼트가 통째로
 *    날아가 절대 경로로 해석된다.
 *
 * 2) config 원형 전달 — 이 서비스의 `getTemplateList(config)` 는 형제 서비스들과 달리 params 인자를
 *    따로 받지 않고 **호출부의 AxiosRequestConfig 를 상속 `get()` 에 그대로 넘긴다**. 그래서
 *    `{ ...config, params }` 같은 재포장이 일어나지 않고, 인자를 생략하면 `undefined` 가, SSR 이
 *    토큰 없이 넘기는 `{}` 는 `{}` 그대로 클라이언트에 도달한다. 여기에 임의의 기본 params 를
 *    끼워 넣으면 백엔드가 query 파라미터를 선언하지 않은 엔드포인트에 불필요한 질의가 붙는다.
 *
 * 3) Authorization 헤더 — `page.tsx` 는 서버 컴포넌트라 쿠키의 accessToken 을 직접 헤더로 실어
 *    보낸다(SSR 은 브라우저 쿠키 자동 전송·미들웨어 주입이 없다). 이 헤더가 유실되면 SSR 프리페치가
 *    401 이 되는데, **브라우저 새로고침 경로(handleRefresh)는 헤더 없이도 성공**하므로 개발 중에는
 *    아무도 눈치채지 못한다.
 *
 * 4) 경로 변수 치환 — `getTemplate(tmpltId)` 는 인자가 경로를 결정한다. 슬래시가 하나 빠지거나
 *    두 개가 되면 **다른 자원을 조회**하거나 목록 경로로 흡수된다.
 *
 * 5) 요청 본문 무가공 — `createTemplate` 은 화면 상태 객체(TmplatInfo)를 그대로 POST 한다. 래핑
 *    (`{ tmplatInfo }`)이 끼거나 useYn 같은 값에 클라이언트 기본값이 덧씌워지면 등록 결과가
 *    화면 입력과 달라진다.
 *
 * 6) 실패 전파 — `page.tsx` 는 과거 `.catch(() => [])` 로 조회 실패를 빈 배열로 삼켜 "템플릿 0건"
 *    으로 위장했다(감사 P1-1). 지금은 서비스가 예외를 그대로 올려 `use()` → error.tsx 경계에서
 *    드러나고, 클라이언트도 그 예외로 loadError/토스트를 띄운다. 서비스가 실패를 삼키는 순간
 *    두 안전장치가 동시에 무력해진다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·config·본문으로 나가고 무엇을 되돌려주는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// axios 인스턴스/인터셉터는 로드하지 않고, 파일별 mock 격리는 유지한다.
vi.mock('@/lib/api/client', async () => ({
  default: (await import('@/test-utils/api-client-test-double')).apiClientTestDouble,
}));

import { templateAdminService, type TmplatInfo } from '../TemplateAdminService';
import {
  apiClientTestDouble as client,
  resetApiClientTestDouble,
} from '@/test-utils/api-client-test-double';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/templates')` + category 기본값 'system' → `admin/system/templates`
 * (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 * 화면 URL 이 /admin/community/templates 라고 해서 접두가 community 인 것이 아니다.
 */
const BASE = 'admin/system/templates';

/** 등록 다이얼로그(TemplateAdminClient)의 초기 상태와 동일한 형태의 페이로드. */
const newTemplate: TmplatInfo = {
  tmpltNm: '기본 게시판 스킨',
  tmpltSeCd: 'TMPT01',
  tmpltPath: '/src/templates/board/basic.html',
  useYn: 'Y',
};

describe('TemplateAdminService — 템플릿 관리자 API 계약', () => {
  beforeEach(() => resetApiClientTestDouble());

  describe('템플릿 목록 조회 (getTemplateList)', () => {
    it('목록은 admin/system/templates 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await templateAdminService.getTemplateList();

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(client.get).toHaveBeenCalledWith(BASE, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, undefined);
    });

    it('접두는 system 이다 — 화면 경로(/admin/community/templates)를 따라 community 로 나가지 않는다', async () => {
      // 형제 CommunityAdminService 는 category 'content' 를 명시하지만 이 서비스는 기본값을 쓴다.
      await templateAdminService.getTemplateList();

      expect(client.get).toHaveBeenCalledWith('admin/system/templates', undefined);
      expect(client.get).not.toHaveBeenCalledWith('admin/community/templates', undefined);
      expect(client.get).not.toHaveBeenCalledWith('admin/content/templates', undefined);
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체나 params 껍데기로 바꿔치지 않는다', async () => {
      // 이 서비스는 `{ ...config, params }` 재포장을 하지 않는다(형제 DeptAdminService 와 다른 지점).
      // 임의로 params 를 만들어 붙이면 query 를 선언하지 않은 백엔드 엔드포인트에 잉여 질의가 붙는다.
      await templateAdminService.getTemplateList();

      expect(client.get).toHaveBeenCalledWith(BASE, undefined);
      expect(client.get).not.toHaveBeenCalledWith(BASE, {});
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { pageIndex: 1 } });
    });

    it('SSR 이 토큰 없이 넘기는 빈 config({})는 빈 객체 그대로 전달된다', async () => {
      // page.tsx: `const axiosConfig = accessToken ? { headers: {...} } : {}`
      await templateAdminService.getTemplateList({});

      expect(client.get).toHaveBeenCalledWith(BASE, {});
      expect(client.get).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('SSR 호출부가 넘기는 Authorization 헤더가 유실되지 않는다', async () => {
      // 서버 컴포넌트(page.tsx)는 쿠키에서 뽑은 Bearer 토큰을 config 로 넘긴다. 유실되면 401 이다.
      const headers = { Authorization: 'Bearer test-token' };

      await templateAdminService.getTemplateList({ headers });

      expect(client.get).toHaveBeenCalledWith(BASE, { headers });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {});
    });

    it('목록 조회 시 timeout·AbortSignal 이 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await templateAdminService.getTemplateList({ timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, { timeout: 3000, signal });
    });

    it('호출부가 config.params 를 주면 상속된 BaseSearchDto 변환이 적용된다 — page 2 는 pageIndex 3 이다', async () => {
      // 이 서비스 고유의 페이징 축은 없다(백엔드 selectTmplatInfoList 는 query 파라미터를 선언하지 않고
      // 현재 호출부도 params 를 넘기지 않는다). 다만 config 를 상속 get() 에 그대로 넘기므로
      // ApiService 의 0-based page → 1-based pageIndex(+1), size → recordCountPerPage 변환이
      // 이 메서드를 통해서도 살아 있다는 사실을 고정해 둔다. page/size 원본 키는 지워지지 않는다
      // (Spring Data Pageable 병행 지원).
      await templateAdminService.getTemplateList({ params: { page: 2, size: 10 } });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 2, size: 10, pageIndex: 3, recordCountPerPage: 10 },
      });
      // +1 이 사라지면(pageIndex 2) 목록이 한 페이지씩 밀린다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 2, size: 10, pageIndex: 2, recordCountPerPage: 10 },
      });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const templates: TmplatInfo[] = [
        {
          tmpltId: 'TMPT_001',
          tmpltNm: '기본 게시판 스킨',
          tmpltSeCd: 'TMPT01',
          tmpltPath: '/src/templates/board/basic.html',
          useYn: 'Y',
          frstRgtrId: 'admin',
          crtDt: '2026-08-15T09:00:00',
        },
        {
          tmpltId: 'TMPT_002',
          tmpltNm: '커뮤니티 카드형',
          tmpltSeCd: 'TMPT02',
          tmpltPath: '/src/templates/community/card.html',
          useYn: 'N',
        },
      ];
      client.get.mockResolvedValueOnce(templates);

      await expect(templateAdminService.getTemplateList()).resolves.toBe(templates);
    });

    it('조회 실패를 빈 배열로 삼키지 않고 그대로 전파한다', async () => {
      // 감사 P1-1: 과거 page.tsx 가 `.catch(() => [])` 로 실패를 "템플릿 0건" 으로 위장했다.
      // 서비스가 같은 은폐를 하면 error.tsx 경계도, 클라이언트의 loadError 토스트도 무력해진다.
      const failure = new Error('템플릿 목록을 불러오지 못했습니다.');
      client.get.mockRejectedValueOnce(failure);

      await expect(templateAdminService.getTemplateList()).rejects.toBe(failure);
    });
  });

  describe('템플릿 상세 조회 (getTemplate)', () => {
    it('tmpltId 가 경로 변수로 붙고 config 는 그대로 전달된다', async () => {
      await templateAdminService.getTemplate('TMPT_001', { timeout: 1000 });

      // 인자가 아닌 다른 id 를 따라가면 화면에서 고른 템플릿이 아닌 엉뚱한 자원을 읽는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/TMPT_001`, { timeout: 1000 });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/TMPT_002`, { timeout: 1000 });
    });

    it('상세 경로는 슬래시 하나로만 이어 붙고 목록 경로로 흡수되지 않는다', async () => {
      await templateAdminService.getTemplate('TMPT_001');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/TMPT_001`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}//TMPT_001`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}TMPT_001`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('상세 조회에서도 Authorization 헤더가 보존된다', async () => {
      const headers = { Authorization: 'Bearer test-token' };

      await templateAdminService.getTemplate('TMPT_001', { headers });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/TMPT_001`, { headers });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/TMPT_001`, undefined);
    });

    it('상세 응답은 무가공으로 반환된다', async () => {
      const template: TmplatInfo = {
        tmpltId: 'TMPT_002',
        tmpltNm: '커뮤니티 카드형',
        tmpltSeCd: 'TMPT02',
        tmpltPath: '/src/templates/community/card.html',
        useYn: 'N',
      };
      client.get.mockResolvedValueOnce(template);

      await expect(templateAdminService.getTemplate('TMPT_002')).resolves.toBe(template);
    });
  });

  describe('템플릿 등록 (createTemplate)', () => {
    it('컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      await templateAdminService.createTemplate(newTemplate);

      // tmpltId 는 서버가 채번하므로 본문에 없어도 되고, 경로에도 붙지 않는다.
      expect(client.post).toHaveBeenCalledWith(BASE, newTemplate, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, newTemplate, undefined);
    });

    it('본문에 tmpltId 가 실려 있어도 경로 변수로 승격되지 않는다 — 등록은 항상 컬렉션으로 나간다', async () => {
      // 본문의 id 를 경로로 끌어올리면 존재하지도 않는 단건 POST 엔드포인트를 치게 된다
      // (OpenAPI 실측: /admin/system/templates/{tmpltId} 에는 GET 만 있다).
      const payload: TmplatInfo = { ...newTemplate, tmpltId: 'TMPT_009' };

      await templateAdminService.createTemplate(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/TMPT_009`, payload, undefined);
    });

    it('본문을 래핑하지 않는다 — 백엔드가 TemplateDto 단일 객체로 받는다', async () => {
      await templateAdminService.createTemplate(newTemplate);

      expect(client.post).toHaveBeenCalledWith(BASE, newTemplate, undefined);
      expect(client.post).not.toHaveBeenCalledWith(BASE, { tmplatInfo: newTemplate }, undefined);
    });

    it('입력한 필드를 클라이언트가 덮어쓰지 않는다 — useYn:N 은 N 그대로 나간다', async () => {
      // 다이얼로그 기본값이 'Y' 라, 비활성으로 고쳐 등록한 값이 되살아나면 화면 입력과 결과가 갈린다.
      const payload: TmplatInfo = {
        tmpltNm: '보관용 일반 템플릿',
        tmpltSeCd: 'TMPT03',
        tmpltPath: '/src/templates/common/plain.html',
        useYn: 'N',
      };

      await templateAdminService.createTemplate(payload);

      expect(client.post).toHaveBeenCalledWith(
        BASE,
        {
          tmpltNm: '보관용 일반 템플릿',
          tmpltSeCd: 'TMPT03',
          tmpltPath: '/src/templates/common/plain.html',
          useYn: 'N',
        },
        undefined
      );
      expect(client.post).not.toHaveBeenCalledWith(BASE, { ...payload, useYn: 'Y' }, undefined);
    });

    it('등록 시 config(timeout·headers)가 유실되지 않는다', async () => {
      const headers = { Authorization: 'Bearer test-token' };

      await templateAdminService.createTemplate(newTemplate, { timeout: 5000, headers });

      expect(client.post).toHaveBeenCalledWith(BASE, newTemplate, { timeout: 5000, headers });
      expect(client.post).not.toHaveBeenCalledWith(BASE, newTemplate, undefined);
    });

    it('등록 실패를 삼키지 않고 그대로 전파한다 — 화면의 실패 토스트가 이 예외에 의존한다', async () => {
      // TemplateAdminClient.handleAdd 는 catch 에서만 오류 토스트를 띄우고, 성공 경로에서는
      // "새 템플릿을 등록했습니다" 를 띄운 뒤 목록을 새로고침한다. 예외를 삼키면 실패가 성공으로 보인다.
      const failure = new Error('이미 존재하는 템플릿 경로입니다.');
      client.post.mockRejectedValueOnce(failure);

      await expect(templateAdminService.createTemplate(newTemplate)).rejects.toBe(failure);
    });
  });

  describe('HTTP 동사·경로 격리', () => {
    it('이 서비스는 GET·POST 두 동사만 쓴다 — 수정·삭제 엔드포인트는 백엔드에 존재하지 않는다', async () => {
      // OpenAPI 실측: /admin/system/templates 는 get·post 만, /{tmpltId} 는 get 만 정의돼 있다.
      await templateAdminService.getTemplateList();
      await templateAdminService.getTemplate('TMPT_001');
      await templateAdminService.createTemplate(newTemplate);

      expect(client.get).toHaveBeenCalledTimes(2);
      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
      expect(client.delete).not.toHaveBeenCalled();
    });

    it('조회 2종의 경로는 서로 겹치지 않는다 — 상세가 목록으로 흡수되면 항상 전체 목록을 받는다', async () => {
      await templateAdminService.getTemplateList();
      await templateAdminService.getTemplate('TMPT_001');

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/templates',
        'admin/system/templates/TMPT_001',
      ]);
    });

    it('모든 요청 경로는 admin/system/templates 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      await templateAdminService.getTemplateList({ headers: { Authorization: 'Bearer test-token' } });
      await templateAdminService.getTemplate('TMPT_001');
      await templateAdminService.createTemplate(newTemplate);

      const paths = [client.get, client.post, client.put, client.patch, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(3);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });
});
