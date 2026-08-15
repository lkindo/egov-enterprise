/**
 * HpcmAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/HpcmAdminService.ts` 는 도움말(HPCM) 콘텐츠 관리의 유일한 API
 * 진입점이다(호출부 실측: admin/system/hpcm/page.tsx 의 SSR 목록 조회, HpcmClient.tsx 의 등록 모달).
 * 메서드 본문이 한 줄씩이라 "테스트할 게 없다"고 보이지만, 아래 항목들은 **틀어져도 컴파일·타입
 * 검사를 모두 통과한 채 런타임에서만 조용히 깨진다**.
 *
 * 1) URL 접두가 형제 서비스와 다르다 — 이 파일에서 가장 위험한 지점이다.
 *    같은 디렉터리의 DeptAdminService·MenuAdminService 등은 `AdminService` 를 상속해
 *    `admin/{category}/…` 접두를 얻는다. 그런데 **HpcmAdminService 는 `ApiService` 를 직접 상속하고
 *    `super('help/hpcm')` 만 넘긴다**(소스 14~17행). 최종 경로는 `help/hpcm` 이며 axios
 *    baseURL('/api/v1')과 합쳐져 `/api/v1/help/hpcm` 이 된다. 백엔드도 관리자 전용이 아니라 업무
 *    컨트롤러 `HelpApiController`(`@RequestMapping("/api/v1/help")` + `@GetMapping("/hpcm")`)가 받는다.
 *    클래스 이름이 "…AdminService" 라서 표준화 명목으로 `extends AdminService` 로 바꾸면 경로가
 *    `admin/system/help/hpcm` 이 되어 **5개 메서드가 한꺼번에 404** 가 된다. 타입은 그대로다.
 *    선행 슬래시가 되살아나면(`/help/hpcm`) axios baseURL 의 경로 세그먼트('/api/v1')가 통째로
 *    날아가 절대 경로로 해석된다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 를 **덧붙인다**(원본 키는 지우지 않는다). 이 엔드포인트는
 *    BaseSearchDto 가 아니라 **Spring Data `Pageable`**(`@PageableDefault(size = 10)`)로 바인딩되므로
 *    서버가 실제로 읽는 키는 원본 `page`/`size` 다. 즉 "정규화"라는 이름으로 원본 키를 지우는 변경이
 *    들어오면 목록이 통째로 서버 기본값(0페이지·10건)으로 되돌아가고, 반대로 +1 이 원본 `page` 에까지
 *    적용되면 한 페이지씩 밀린다. 두 경우 모두 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 경로 변수 치환 — `getHpcm`/`updateHpcm`/`deleteHpcm` 은 **인자 `hlpSn`** 이 경로를 결정한다.
 *    본문(`data.hlpSn`)을 따라가도록 바뀌면 화면에서 고른 도움말이 아닌 **엉뚱한 도움말을 고치거나
 *    지운다**. 특히 삭제는 되돌리기 어렵다.
 *
 * 4) config 전달 — 현재 호출부는 config 를 넘기지 않지만, 5개 메서드 전부 `AxiosRequestConfig` 를
 *    공개 시그니처로 받는다. timeout·AbortSignal·headers 가 유실돼도 타입은 통과하고 브라우저
 *    경로에서는 요청이 성공하므로 아무도 눈치채지 못한다(화면 이탈 시 요청 취소 불가, SSR Bearer 누락).
 *
 * 5) 검색어 축 — 백엔드는 `@RequestParam(required = false) String keyword` **단일 축**이다.
 *    형제 서비스(SurveyAdminService 등)의 `searchKeyword → keyword` 승격 로직이 잘못 이식되면 두 키가
 *    동시에 나가며 서버 바인딩이 흔들린다.
 *
 * 6) 응답·본문 무가공 — `createHpcm` 은 서버가 채번한 `Long hlpSn` 을 그대로 돌려주고(컨트롤러
 *    `insertHpcm` → `ApiResponse.success(hlpSn)`), 요청 본문도 래핑 없이 그대로 실린다. 문자열화나
 *    `{ data: … }` 래핑이 끼어들면 등록 직후 후속 처리가 깨진다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { hpcmAdminService, type Hpcm } from '../HpcmAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두 — **소스 확인값**이다.
 * `HpcmAdminService extends ApiService` + `super('help/hpcm')` → basePath 그대로 `help/hpcm`.
 * (`AdminService` 를 상속하지 않으므로 `admin/system/` 접두가 붙지 않는다. 선행 슬래시도 없다.)
 */
const BASE = 'help/hpcm';

/** 형제 서비스(AdminService 상속)였다면 나왔을 경로 — 여기로 바뀌면 전 메서드가 404 다. */
const ADMIN_PREFIXED = 'admin/system/help/hpcm';

describe('HpcmAdminService — 도움말(HPCM) 관리 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('도움말 목록 조회 (getHpcmList)', () => {
    it('목록은 help/hpcm 으로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await hpcmAdminService.getHpcmList();

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: undefined });
    });

    it('admin/system 접두를 붙이지 않는다 — 이 서비스만 ApiService 를 직접 상속한다', async () => {
      await hpcmAdminService.getHpcmList();

      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(ADMIN_PREFIXED, { params: undefined });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await hpcmAdminService.getHpcmList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('page 2·size 20 은 pageIndex 3·recordCountPerPage 20 이 되고 원본 키도 함께 남는다', async () => {
      await hpcmAdminService.getHpcmList({ page: 2, size: 20 });

      // 원본 page/size 를 지우지 않는 것이 이 엔드포인트에서는 필수다 —
      // 백엔드가 Pageable 로 바인딩하므로 서버가 실제로 읽는 키가 바로 page/size 다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 2, size: 20, pageIndex: 3, recordCountPerPage: 20 },
      });
    });

    it('page 값에 +1 이 두 번 적용되지 않는다 — page 4 의 pageIndex 는 5 이고 6 이 아니다', async () => {
      await hpcmAdminService.getHpcmList({ page: 4 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 4, pageIndex: 5 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 4, pageIndex: 6 } });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // page 9 였다면 변환 결과는 pageIndex 10 이겠지만, 명시값 1 이 그대로 유지돼야 한다.
      await hpcmAdminService.getHpcmList({ page: 9, pageIndex: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 9, pageIndex: 1 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 9, pageIndex: 10 } });
    });

    it('pageSize 만 오면 recordCountPerPage 와 size 를 함께 채운다 (Common DTO 호환 축)', async () => {
      await hpcmAdminService.getHpcmList({ pageSize: 25 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, recordCountPerPage: 25, size: 25 },
      });
    });

    it('keyword 는 가공 없이 그대로 실리고 페이징 키가 임의로 동승하지 않는다', async () => {
      // 객체 전체 비교이므로 page·size·pageIndex 같은 기본값이 주입되면 이 단언이 깨진다.
      // 기본 페이지 크기는 서버(@PageableDefault(size = 10))가 정한다 — 클라이언트가 정하지 않는다.
      await hpcmAdminService.getHpcmList({ keyword: '게시판' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { keyword: '게시판' } });
    });

    it('searchKeyword 를 keyword 로 승격하지 않는다 — 백엔드는 keyword 단일 축이다', async () => {
      // 승격 로직이 잘못 이식되면 keyword 와 searchKeyword 가 동시에 나가 서버 바인딩이 흔들린다.
      await hpcmAdminService.getHpcmList({ searchKeyword: '게시판' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '게시판' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '게시판', keyword: '게시판' },
      });
    });

    it('params 인자가 config.params 를 이긴다 — `{ ...config, params }` 의 전개 순서를 고정한다', async () => {
      // 순서가 뒤집혀 config.params 가 이기면, 호출부가 지정한 검색 조건이 조용히 사라진다.
      await hpcmAdminService.getHpcmList({ keyword: '적용됨' }, { params: { keyword: '무시됨' } });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { keyword: '적용됨' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { keyword: '무시됨' } });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await hpcmAdminService.getHpcmList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('params 없이 config 만 넘겨도 headers 가 유실되지 않는다', async () => {
      // SSR(page.tsx)에서 쿠키 기반 Bearer 를 직접 실어야 할 때 쓰는 축이다.
      const headers = { Authorization: 'Bearer test-token' };

      await hpcmAdminService.getHpcmList(undefined, { headers });

      expect(client.get).toHaveBeenCalledWith(BASE, { headers, params: undefined });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<Hpcm> = {
        list: [
          { hlpSn: 1, hlpSeCd: '게시판', hlpDfn: '게시판 물리삭제 가이드', hlpExpln: '검증 프로토콜' },
          { hlpSn: 2, hlpSeCd: '로그인', hlpDfn: '비밀번호 초기화', hlpExpln: '본인확인 절차' },
        ],
        total: 2,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      // page.tsx 가 `res.list` 를 그대로 꺼내 쓰므로, 래핑이 한 겹만 끼어도 목록이 빈다.
      await expect(hpcmAdminService.getHpcmList()).resolves.toBe(page);
    });
  });

  describe('도움말 상세 조회 (getHpcm)', () => {
    it('hlpSn 이 경로 변수로 붙고 config 는 그대로 전달된다', async () => {
      await hpcmAdminService.getHpcm(4103, { timeout: 1000 });

      // 단건 조회는 params 가 없으므로 페이징 정규화가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/4103`, { timeout: 1000 });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/4104`, { timeout: 1000 });
    });

    it('숫자 hlpSn 은 쿼리스트링이 아니라 경로 세그먼트로 이어붙는다', async () => {
      await hpcmAdminService.getHpcm(7);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { hlpSn: 7 } });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await hpcmAdminService.getHpcm(7);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/7`, {});
    });

    it('상세 응답은 무가공으로 반환된다', async () => {
      const hpcm: Hpcm = {
        hlpSn: 7,
        hlpSeCd: '회원가입',
        hlpDfn: '가입 승인 절차',
        hlpExpln: '관리자 승인 후 활성화된다',
        frstRgtrId: 'ADMIN',
      };
      client.get.mockResolvedValueOnce(hpcm);

      await expect(hpcmAdminService.getHpcm(7)).resolves.toBe(hpcm);
    });
  });

  describe('도움말 등록 (createHpcm)', () => {
    it('컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      const payload: Partial<Hpcm> = {
        hlpSeCd: '게시판',
        hlpDfn: '게시판 물리삭제 기능 가이드',
        hlpExpln: '영구 말소 시 준수해야 하는 검증 프로토콜',
      };

      await hpcmAdminService.createHpcm(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload, undefined);
    });

    it('본문을 { data: … } 로 래핑하지 않는다 — 백엔드가 @RequestBody HpcmDto 로 직접 받는다', async () => {
      const payload: Partial<Hpcm> = { hlpSeCd: '로그인', hlpDfn: '2차 인증', hlpExpln: 'OTP 안내' };

      await hpcmAdminService.createHpcm(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(BASE, { data: payload }, undefined);
    });

    it('본문에 hlpSn 이 실려 있어도 경로 변수로 승격되지 않는다 — 채번은 서버 몫이다', async () => {
      const payload: Partial<Hpcm> = { hlpSn: 99, hlpSeCd: '게시판', hlpDfn: '오탈자 수정 안내' };

      await hpcmAdminService.createHpcm(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      // `${BASE}/99` 로 나가면 등록이 아니라 존재하지 않는 자원에 대한 POST 가 된다(405/404).
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/99`, payload, undefined);
    });

    it('등록 시 config(timeout)가 유실되지 않는다', async () => {
      const payload: Partial<Hpcm> = { hlpSeCd: '게시판', hlpDfn: '첨부파일 제한' };

      await hpcmAdminService.createHpcm(payload, { timeout: 5000 });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 5000 });
    });

    it('서버가 채번한 hlpSn 을 숫자 그대로 반환한다 — 문자열화하지 않는다', async () => {
      client.post.mockResolvedValueOnce(4103);

      // toBe 는 '4103'(문자열)과 4103(숫자)을 구분한다.
      await expect(hpcmAdminService.createHpcm({ hlpDfn: '신규 도움말' })).resolves.toBe(4103);
    });

    it('등록 실패(검증 오류 등)는 삼키지 않고 그대로 전파한다', async () => {
      // HpcmClient 는 이 예외로 토스트를 띄운다. 삼키면 실패가 성공으로 보인다.
      const failure = new Error('필수 항목이 누락되었습니다');
      client.post.mockRejectedValueOnce(failure);

      await expect(hpcmAdminService.createHpcm({ hlpDfn: '' })).rejects.toBe(failure);
    });
  });

  describe('도움말 수정 (updateHpcm)', () => {
    it('인자로 받은 hlpSn 이 경로를 결정한다 — 본문의 hlpSn 이 아니다', async () => {
      // 본문에 다른 hlpSn(99)을 심어 두고, 경로는 인자(7)만 따르는지 확인한다.
      // 본문을 따라가도록 바뀌면 화면에서 고른 도움말이 아닌 엉뚱한 도움말이 수정된다.
      const payload: Partial<Hpcm> = { hlpSn: 99, hlpDfn: '제목만 수정' };

      await hpcmAdminService.updateHpcm(7, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/99`, payload, { timeout: 2000 });
    });

    it('수정은 컬렉션 경로로 나가지 않는다 — 경로 변수가 빠지면 전체를 대상으로 하는 요청이 된다', async () => {
      const payload: Partial<Hpcm> = { hlpDfn: '제목만 수정' };

      await hpcmAdminService.updateHpcm(7, payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, undefined);
      expect(client.put).not.toHaveBeenCalledWith(BASE, payload, undefined);
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다', async () => {
      const payload: Partial<Hpcm> = { hlpExpln: '설명 보강' };

      await hpcmAdminService.updateHpcm(7, payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, undefined);
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/7`, payload, {});
    });

    it('수정 본문도 래핑 없이 그대로 실린다', async () => {
      const payload: Partial<Hpcm> = { hlpSeCd: '로그인', hlpDfn: '비밀번호 규칙 변경' };

      await hpcmAdminService.updateHpcm(7, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/7`, { data: payload }, { timeout: 2000 });
    });
  });

  describe('도움말 삭제 (deleteHpcm)', () => {
    it('지정한 hlpSn 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await hpcmAdminService.deleteHpcm(7);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      // 경로 변수가 사라지면 컬렉션 전체에 대한 DELETE 가 된다 — 되돌릴 수 없는 사고다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('다른 hlpSn 으로 새어 나가지 않는다', async () => {
      await hpcmAdminService.deleteHpcm(7);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/8`, undefined);
    });

    it('hlpSn 0 도 경로 세그먼트로 남는다 — falsy 라고 컬렉션 경로로 축약하지 않는다', async () => {
      // `hlpSn ? `/${hlpSn}` : ''` 같은 truthiness 가드가 끼어들면 단건 삭제가 전체 삭제 요청으로
      // 바뀐다. 0 은 실 데이터에 없지만(PK 는 1부터 채번) 계산 실수로 흘러들 수 있는 값이다.
      await hpcmAdminService.deleteHpcm(0);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/0`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('삭제 시 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await hpcmAdminService.deleteHpcm(7, { signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, { signal });
    });

    it('클라이언트는 삭제 가능 여부를 자체 판단하지 않는다 — 서버 오류를 그대로 전파한다', async () => {
      const failure = new Error('참조 중인 도움말은 삭제할 수 없습니다');
      client.delete.mockRejectedValueOnce(failure);

      await expect(hpcmAdminService.deleteHpcm(7)).rejects.toBe(failure);
    });
  });

  describe('경로 격리', () => {
    it('목록과 상세는 서로 다른 경로를 쓴다 — 상세가 목록으로 흡수되면 단건 조회가 페이지를 통째로 끌어온다', async () => {
      await hpcmAdminService.getHpcmList();
      await hpcmAdminService.getHpcm(7);

      expect(client.get.mock.calls.map((call) => call[0])).toEqual(['help/hpcm', 'help/hpcm/7']);
    });

    it('같은 hlpSn 에 대한 조회·수정·삭제는 동일한 경로를 겨눈다', async () => {
      await hpcmAdminService.getHpcm(7);
      await hpcmAdminService.updateHpcm(7, { hlpDfn: '수정' });
      await hpcmAdminService.deleteHpcm(7);

      expect(client.get.mock.calls.map((call) => call[0])).toEqual(['help/hpcm/7']);
      expect(client.put.mock.calls.map((call) => call[0])).toEqual(['help/hpcm/7']);
      expect(client.delete.mock.calls.map((call) => call[0])).toEqual(['help/hpcm/7']);
    });

    it('5개 메서드의 경로는 모두 help/hpcm 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      await hpcmAdminService.getHpcmList({ page: 0 });
      await hpcmAdminService.getHpcm(7);
      await hpcmAdminService.createHpcm({ hlpDfn: '신규' });
      await hpcmAdminService.updateHpcm(7, { hlpDfn: '수정' });
      await hpcmAdminService.deleteHpcm(7);

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(5);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
        // 'admin/…' 으로 시작하면 AdminService 상속으로 바뀐 것이다 — 전 메서드 404.
        expect(path.startsWith('admin/')).toBe(false);
      });
    });
  });
});
