/**
 * OnlinePollAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/OnlinePollAdminService.ts` 는 온라인 투표(polls) 관리자
 * 화면(`/admin/survey/polls`, `/admin/survey/polls/participate`)의 유일한 API 진입점인데도
 * 커버리지 0% 였다. 메서드 4개짜리 얇은 래퍼라 "테스트할 게 없다"고 보이지만, 아래 항목들은
 * **틀어져도 컴파일·타입 검사를 모두 통과한 채 런타임에서만 조용히 깨진다**.
 *
 * 1) URL 조합 — `AdminService('/polls')` 는 `ApiService` 에서 선행 슬래시가 제거되고
 *    `admin/{category}/` 접두가 붙어 최종 `admin/system/polls` 가 된다(category 기본값 'system').
 *    백엔드 `OnlinePollApiController` 의 `@RequestMapping("/api/v1/admin/system/polls")` 와
 *    axios baseURL(`/api/v1`)이 맞물려야만 성립하므로, 접두 규칙이나 생성자 인자가 한 글자만
 *    어긋나도 4개 메서드가 동시에 404 가 된다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환하되 **원본 키를 지우지 않는다**. 이 컨트롤러는
 *    `@PageableDefault Pageable` 로 받으므로 실제로 읽는 것은 원본 `page`/`size` 쪽이다.
 *    변환 과정에서 원본 키가 삭제되면 목록이 항상 1페이지만 나오고, +1 이 사라지거나 두 번
 *    적용되면 페이지가 통째로 밀린다. 타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 투표(vote)의 인자 2개 — 백엔드 시그니처는 `@PostMapping("/{pollSn}/vote")` +
 *    `@RequestParam Long pollArtclSn` 이다. 즉 **설문 번호는 경로에, 항목 번호는 쿼리에** 실려야
 *    한다. 둘 다 number 라 순서가 뒤바뀌어도 타입은 통과하지만 실제로는 **엉뚱한 설문에 표를
 *    던진다** — 투표는 이중투표 유니크 제약에 걸려 되돌릴 수 없다. 게다가 본문은 반드시 `null`
 *    이어야 한다. 항목 번호를 "본문에 담는 게 자연스럽다"며 옮기면 `@RequestParam` 이 비어
 *    400 이 된다.
 *
 * 4) 요청 본문 무가공 전달 — `pollBgngYmd`/`pollEndYmd` 는 백엔드에서 `varchar(8)`
 *    (`@Size(max = 8)`)이라 'yyyyMMdd' 8자만 허용된다. 서비스가 중간에서 날짜를 재포맷하거나
 *    객체를 얕은 복제하며 중첩 항목 배열(`pollArticles`)을 흘리면 400 또는 항목 누락이 된다.
 *
 * 5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal)가 유실되면 화면 이탈
 *    시 요청 취소가 동작하지 않고 타임아웃이 기본값(15초)으로 되돌아간다. 유실돼도 요청 자체는
 *    성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 *
 * ⚠ 이 서비스에는 수정(PUT)·삭제(DELETE) 메서드가 없다 — 백엔드 관리자 컨트롤러에도 해당
 *   엔드포인트가 없기 때문이다. 없는 메서드를 지어내지 않고, 그 대신 이 서비스 고유의 최대
 *   위험인 `vote` 2-인자 치환에 검증 예산을 몰아 둔다.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
// 이 서비스가 쓰는 동사는 get·post 뿐이라 둘만 심는다. put/delete 로 새는 회귀가 생기면
// "함수가 아니다"로 요란하게 죽어 조용한 통과가 불가능하다.
const client = vi.hoisted(() => {
  const legacy = { get: vi.fn(), post: vi.fn() };
  const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
  return {
    ...legacy,
    getRaw: vi.fn(async (url: string, config?: unknown) => envelope(await legacy.get(url, config))),
    requestRaw: vi.fn(async (request: Record<string, unknown>) => {
      const { url, method, data, ...config } = request;
      if (method !== 'post') throw new Error(`unexpected method: ${String(method)}`);
      const forwardedConfig = Object.keys(config).length > 0 ? config : undefined;
      return envelope(await legacy.post(url, data ?? null, forwardedConfig));
    }),
  };
});

vi.mock('@/lib/api/client', () => ({ default: client }));

import { onlinePollAdminService, type OnlinePollDto } from '../OnlinePollAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/polls')` + category 기본값 'system' → `admin/system/polls` (선행 슬래시 없음).
 * 소스에서 확인한 실제 값이며, 백엔드 `@RequestMapping("/api/v1/admin/system/polls")` 와 정합한다.
 */
const BASE = 'admin/system/polls';

/** 등록 테스트가 공유하는 최소 유효 DTO 팩토리 — 호출마다 새 객체를 만들어 상호 오염을 막는다. */
const buildPollDto = (): OnlinePollDto => ({
  pollNm: '사내 복지 선호도 조사',
  pollBgngYmd: '20260901',
  pollEndYmd: '20260930',
  pollKndCd: '01',
  pollDsuseYn: 'N',
  pollArticles: [{ pollArtclNm: '재택근무 확대' }, { pollArtclNm: '식대 인상' }],
});

describe('OnlinePollAdminService — 온라인 투표 관리자 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.get.mockImplementation((url: string) => Promise.resolve(
      url === BASE ? { list: [] } : buildPollDto(),
    ));
  });

  describe('목록 조회(getPollList)', () => {
    it('목록은 admin/system/polls 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await onlinePollAdminService.getPollList();

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: {} });
    });

    it('빈 params 객체는 그대로 나간다 — keyword 기본값을 지어내 채우지 않는다', async () => {
      // 형제 서비스(SurveyAdminService·PollUserService)는 keyword 를 ''로 강제 승격하지만
      // 이 서비스는 하지 않는다. 백엔드가 `@RequestParam(required = false) String keyword` 라
      // 미전송과 빈 문자열이 동치가 아닐 수 있어, 차이를 계약으로 못 박는다.
      await onlinePollAdminService.getPollList({});

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { keyword: '' } });
    });

    it('첫 페이지는 Pageable 계약의 0-based page 0으로 전달한다', async () => {
      await onlinePollAdminService.getPollList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 0 } });
    });

    it('page 3·size 20은 generated Pageable query 그대로 전달한다', async () => {
      await onlinePollAdminService.getPollList({ page: 3, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 3, size: 20 },
      });
    });

    it('size만 주면 generated Pageable size만 전달한다', async () => {
      await onlinePollAdminService.getPollList({ size: 15 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { size: 15 } });
    });

    it('keyword 는 가공·인코딩 없이 원문 그대로 전달된다', async () => {
      await onlinePollAdminService.getPollList({ keyword: '복지 선호도' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { keyword: '복지 선호도' } });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await onlinePollAdminService.getPollList({ page: 1, size: 10 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 1, size: 10 },
      });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<OnlinePollDto> = {
        list: [
          {
            pollSn: 42,
            pollNm: '사내 복지 선호도 조사',
            pollBgngYmd: '20260901',
            pollEndYmd: '20260930',
            pollKndCd: '01',
            pollDsuseYn: 'N',
            frstRgtrId: 'admin',
            crtDt: '2026-09-01T09:00:00',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      // 동일 참조 — 필드 추림·기본값 주입·언랩이 끼어들면 이 단언이 깨진다.
      await expect(onlinePollAdminService.getPollList()).resolves.toBe(page);
    });
  });

  describe('상세 조회(getPoll)', () => {
    it('pollSn 이 경로 변수로 붙고 컬렉션 경로로는 나가지 않는다', async () => {
      await onlinePollAdminService.getPoll(42, { timeout: 1000 });

      // 단건 조회는 params 가 없으므로 페이징 정규화가 개입하지 않고 config 가 통째로 전달된다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/42`, { timeout: 1000 });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await onlinePollAdminService.getPoll(42);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/42`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/42`, {});
    });

    it('상세 응답도 재포장 없이 그대로 반환된다', async () => {
      const poll: OnlinePollDto = {
        pollSn: 42,
        pollNm: '사내 복지 선호도 조사',
        pollBgngYmd: '20260901',
        pollEndYmd: '20260930',
        pollKndCd: '01',
        pollDsuseYn: 'N',
        pollAtmcDsuseYn: 'Y',
        pollArticles: [{ pollArtclSn: 7, pollArtclNm: '재택근무 확대', pollIemCo: 12 }],
      };
      client.get.mockResolvedValueOnce(poll);

      await expect(onlinePollAdminService.getPoll(42)).resolves.toBe(poll);
    });
  });

  describe('등록(createPoll)', () => {
    it('등록은 컬렉션 경로에 요청 본문을 POST 한다 — 후행 슬래시가 붙으면 안 된다', async () => {
      const payload = buildPollDto();

      await onlinePollAdminService.createPoll(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload, undefined);
    });

    it('본문은 generated Zod 검증 후 필드·중첩 항목을 보존해 전달한다', async () => {
      const payload = buildPollDto();

      await onlinePollAdminService.createPoll(payload);

      // Zod parse가 새 객체를 만들어도 값과 중첩 pollArticles는 그대로여야 한다.
      expect(client.post.mock.calls[0][1]).toStrictEqual(payload);
    });

    it('등록에서도 호출부의 timeout·signal 이 유실되지 않는다', async () => {
      const { signal } = new AbortController();
      const payload = buildPollDto();

      await onlinePollAdminService.createPoll(payload, { timeout: 8000, signal });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 8000, signal });
    });
  });

  describe('투표(vote)', () => {
    it('pollSn 은 경로에, pollArtclSn 은 쿼리에 실린다 — 뒤바뀌면 다른 설문에 표를 던진다', async () => {
      await onlinePollAdminService.vote(42, 7);

      // 백엔드: @PostMapping("/{pollSn}/vote") + @RequestParam Long pollArtclSn
      expect(client.post).toHaveBeenCalledWith(`${BASE}/42/vote`, null, {
        params: { pollArtclSn: 7 },
      });
      // 두 인자가 뒤바뀐 형태 — 값이 서로 다르므로 위 단언과 동시에 성립할 수 없다.
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/7/vote`, null, {
        params: { pollArtclSn: 42 },
      });
    });

    it('항목 번호는 경로 세그먼트가 아니라 쿼리 파라미터다 — 사용자용 서비스와 문법이 다르다', async () => {
      await onlinePollAdminService.vote(42, 7);

      // PollUserService.participatePoll 은 `/{pollSn}/vote/{pollArtclSn}` 를 쓴다(백엔드 컨트롤러가 별개).
      // 둘을 헷갈려 통일하면 관리자 투표가 통째로 404 가 된다.
      expect(client.post.mock.calls[0][0]).toBe(`${BASE}/42/vote`);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/42/vote/7`, null, expect.anything());
    });

    it('요청 본문은 null 이다 — 항목 번호를 본문으로 옮기면 @RequestParam 이 비어 400 이다', async () => {
      await onlinePollAdminService.vote(42, 7);

      expect(client.post.mock.calls[0][1]).toBeNull();
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/42/vote`, { pollArtclSn: 7 }, expect.anything());
    });

    it('투표에서도 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await onlinePollAdminService.vote(42, 7, { timeout: 5000, signal });

      expect(client.post).toHaveBeenCalledWith(`${BASE}/42/vote`, null, {
        timeout: 5000,
        signal,
        params: { pollArtclSn: 7 },
      });
    });

    it('인자로 받은 pollArtclSn 이 config.params 를 이긴다 — 호출부 config 로 투표 대상을 바꿔치울 수 없다', async () => {
      await onlinePollAdminService.vote(42, 7, { params: { pollArtclSn: 999 } });

      expect(client.post).toHaveBeenCalledWith(`${BASE}/42/vote`, null, {
        params: { pollArtclSn: 7 },
      });
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/42/vote`, null, {
        params: { pollArtclSn: 999 },
      });
    });

    it('투표는 POST 1회만 발생하고 사전 조회를 곁들이지 않는다 — 읽고-쓰기는 이중투표 경합을 만든다', async () => {
      await onlinePollAdminService.vote(42, 7);

      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.get).not.toHaveBeenCalled();
    });
  });

  describe('경로 격리', () => {
    it('4개 메서드의 경로는 서로 겹치지 않는다 — 겹치면 다른 자원을 조작하게 된다', async () => {
      await onlinePollAdminService.getPollList();
      await onlinePollAdminService.getPoll(42);
      await onlinePollAdminService.createPoll(buildPollDto());
      await onlinePollAdminService.vote(42, 7);

      expect(client.get.mock.calls.map((call) => String(call[0]))).toEqual([
        'admin/system/polls',
        'admin/system/polls/42',
      ]);
      expect(client.post.mock.calls.map((call) => String(call[0]))).toEqual([
        'admin/system/polls',
        'admin/system/polls/42/vote',
      ]);
    });

    it('모든 요청 경로는 admin/system/polls 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로로 해석).
      await onlinePollAdminService.getPollList({ keyword: '복지' });
      await onlinePollAdminService.getPoll(42);
      await onlinePollAdminService.createPoll(buildPollDto());
      await onlinePollAdminService.vote(42, 7);

      const paths = [client.get, client.post].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(4);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
        expect(path.endsWith('/')).toBe(false);
      });
    });
  });
});
