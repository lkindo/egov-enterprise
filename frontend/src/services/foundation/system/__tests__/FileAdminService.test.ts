/**
 * FileAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/FileAdminService.ts` 는 관리자 화면의 **유일한 첨부 업로드
 * 진입점**이다(실측 호출부: `admin/system/banner/BannerAdminClient.tsx` 2개소 — 배너·팝업 이미지,
 * `admin/community/boards/[id]/CommunityBoardsDetailClient.tsx` 1개소 — 게시글 첨부).
 * 두 화면 모두 **업로드로 받은 `atchFileSn` 을 다른 엔티티에 저장**하는 2단계 흐름이라,
 * 이 한 번의 POST 가 틀어지면 배너 이미지가 붙지 않거나 첨부 없는 글이 등록된다.
 *
 * 형제 서비스들과 달리 이 클래스에는 **목록·상세·수정·삭제가 없다** — 페이징 변환도, 경로 변수
 * 치환도 이 서비스에는 존재하지 않는 축이다(따라서 그 축의 테스트도 만들지 않는다). 남은 위험은
 * 전부 **multipart 요청 한 건의 모양**에 몰려 있으며, 아래 항목은 전부 타입 검사를 통과한 채
 * 런타임에서만 조용히 깨진다.
 *
 * 1) URL 조합 — `AdminService('/files', 'system')` 는 `ApiService` 생성자에서 선행 슬래시가
 *    제거되고 `admin/{category}/` 접두가 붙어 최종 `admin/system/files` 가 된다. 백엔드
 *    `FileApiController` 는 `@RequestMapping({"/api/v1/files", "/api/v1/admin/system/files",
 *    "/api/v1/admin/content/files", "/api/v1/admin/operation/files"})` 로 4경로를 모두 받으므로
 *    접두가 흔들려도 404 가 **아닐 수 있다** — 그래서 더 위험하다. 관리자 화면의 업로드가
 *    사용자 경로(`files`)로 새어 나가도 화면상 아무 증상이 없고, 인가 정책을 경로로 구분하는 날
 *    조용히 뚫린다. 선행 슬래시가 되살아나면 axios `baseURL`('/api/v1')이 통째로 날아간다.
 *
 * 2) FormData 필드명 — 백엔드는 `@RequestPart("files") List<MultipartFile>` 단일 파트로 받는다.
 *    키가 `file`(단수)이나 `files[0]`(인덱스형)으로 바뀌면 파트 바인딩이 실패해 400 이고,
 *    타입 시스템은 문자열 리터럴 하나가 바뀐 것을 알 방법이 없다.
 *
 * 3) 다중 파일 축적 — 여러 파일을 **같은 키로 반복 append** 해야 `List<MultipartFile>` 이 채워진다.
 *    또한 `FormData` 는 매 호출마다 새로 만들어야 한다 — 인스턴스가 밖으로 새어 재사용되면
 *    두 번째 업로드에 첫 번째 파일이 딸려 가 **엉뚱한 배너 이미지가 저장**된다.
 *
 * 4) Content-Type 강제 — `{ ...config?.headers, 'Content-Type': 'multipart/form-data' }` 로
 *    리터럴이 spread 뒤에 오기 때문에 항상 이긴다. 순서가 뒤집혀 호출부의 `application/json` 이
 *    이기면 컨트롤러의 `consumes = MULTIPART_FORM_DATA_VALUE` 와 어긋나 415 가 된다.
 *    반대로 호출부의 **다른** 헤더(SSR Bearer 토큰 등)는 살아남아야 한다 — 유실되면 401 이다.
 *
 * 5) 반환값 무가공 — `client.post` 가 `ApiResponse` 봉투를 벗겨 준 `atchFileSn`(number)을 그대로
 *    돌려준다. 여기에 폴백(`|| 0`)이 끼면 서버가 준 0 과 "실패해서 0" 을 구별할 수 없게 되고,
 *    호출부가 그 값을 그대로 엔티티에 저장한다.
 *
 * 6) 서비스 표면 — 목록(`getFiles`)·삭제(`deleteFile`)는 2026-08-05 에 **백엔드 매핑이 없어서**
 *    제거됐다(각각 404/405). 당시 목 기반 테스트가 존재하지 않는 경로를 "올바르다"고 단언하던
 *    false-green 이 있었다. 표면 자체를 고정해 같은 사고가 반복되지 않게 한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·본문·헤더·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { fileAdminService } from '../FileAdminService';

/**
 * 이 서비스의 유일한 요청 경로.
 * `AdminService('/files', 'system')` → `admin/` + category('system') + `files`
 * = `admin/system/files` (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/files';

/** 업로드가 config 없이 호출됐을 때 실제로 나가는 config(헤더 강제만 남는다). */
const MULTIPART_ONLY: AxiosRequestConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
};

const makeFile = (name: string, type = 'text/plain'): File =>
  new File([`${name} 의 내용`], name, { type });

/** n번째 POST 호출의 본문을 FormData 로 좁혀 꺼낸다 — 아니면 그 자리에서 실패시킨다. */
function formDataOf(callIndex: number): FormData {
  const body: unknown = client.post.mock.calls[callIndex]?.[1];
  if (!(body instanceof FormData)) {
    throw new Error(`${callIndex}번째 POST 본문이 FormData 가 아니다: ${String(body)}`);
  }
  return body;
}

/** FormData 의 'files' 파트를 File 배열로 좁혀 반환한다. */
function filePartsOf(formData: FormData): File[] {
  return formData.getAll('files').map((entry) => {
    if (!(entry instanceof File)) {
      throw new Error(`'files' 파트가 File 이 아니다: ${String(entry)}`);
    }
    return entry;
  });
}

/** POST 호출들이 사용한 경로 목록. */
const postedPaths = (): string[] => client.post.mock.calls.map((call) => String(call[0]));

describe('FileAdminService — 첨부 업로드 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('요청 경로 (URL 조합)', () => {
    it('업로드는 admin/system/files 로 나가며 후행 슬래시가 붙지 않는다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt')]);

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(postedPaths()).toEqual([BASE]);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, expect.any(FormData), MULTIPART_ONLY);
    });

    it('경로에 선행 슬래시가 없다 — 붙으면 axios baseURL(/api/v1)이 통째로 날아간다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt')]);

      const [path] = postedPaths();
      expect(path.startsWith('/')).toBe(false);
      expect(path).toBe(BASE);
    });

    it('관리자 접두를 벗어나지 않는다 — 사용자 경로(files)로 새면 인가 축이 갈라진다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt')]);

      // 백엔드가 4경로를 모두 매핑하므로 이 오류는 404 로 드러나지 않는다. 여기서 잡아야 한다.
      expect(client.post).toHaveBeenCalledWith(BASE, expect.any(FormData), MULTIPART_ONLY);
      expect(client.post).not.toHaveBeenCalledWith('files', expect.any(FormData), MULTIPART_ONLY);
      expect(client.post).not.toHaveBeenCalledWith(
        'admin/content/files',
        expect.any(FormData),
        MULTIPART_ONLY
      );
    });

    it('파일 개수·파일명이 경로에 섞이지 않는다 — 경로는 항상 컬렉션 하나다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt')]);
      await fileAdminService.uploadFiles([makeFile('b.png'), makeFile('c.pdf')]);

      expect(postedPaths()).toEqual([BASE, BASE]);
    });

    it('POST 로만 나간다 — 컨트롤러에는 @PostMapping 하나뿐이라 다른 메서드는 405 다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt')]);

      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.get).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
      expect(client.delete).not.toHaveBeenCalled();
    });
  });

  describe('multipart 본문 구성', () => {
    it('본문은 FormData 다 — File 배열을 그대로 실으면 JSON 직렬화돼 빈 객체가 나간다', async () => {
      const files = [makeFile('a.txt')];

      await fileAdminService.uploadFiles(files);

      const body: unknown = client.post.mock.calls[0][1];
      expect(body instanceof FormData).toBe(true);
      expect(body).not.toBe(files);
    });

    it("모든 파일이 'files' 단일 키로 실린다 — 백엔드 @RequestPart(\"files\") 와 1:1 이다", async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt'), makeFile('b.png')]);

      const formData = formDataOf(0);
      expect(formData.has('files')).toBe(true);
      // 단수형·인덱스형 키로 바뀌면 List<MultipartFile> 바인딩이 실패해 400 이 된다.
      expect(formData.has('file')).toBe(false);
      expect(formData.has('files[0]')).toBe(false);
    });

    it('파일 3개는 같은 키에 3개 파트로 누적된다 — 마지막 하나로 덮어쓰지 않는다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt'), makeFile('b.png'), makeFile('c.pdf')]);

      const parts = filePartsOf(formDataOf(0));
      expect(parts).toHaveLength(3);
    });

    it('파일 순서가 인자 배열 순서 그대로 보존된다 — 배너는 files[0].name 을 이미지명으로 쓴다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt'), makeFile('b.png'), makeFile('c.pdf')]);

      const names = filePartsOf(formDataOf(0)).map((file) => file.name);
      expect(names).toEqual(['a.txt', 'b.png', 'c.pdf']);
      expect(names).not.toEqual(['c.pdf', 'b.png', 'a.txt']);
    });

    it('파일을 복제·재포장하지 않고 호출부가 준 인스턴스를 그대로 싣는다', async () => {
      const first = makeFile('a.txt');
      const second = makeFile('b.png', 'image/png');

      await fileAdminService.uploadFiles([first, second]);

      const parts = filePartsOf(formDataOf(0));
      expect(parts[0]).toBe(first);
      expect(parts[1]).toBe(second);
      // 재포장되면 MIME 타입이 유실돼 서버 확장자 검증이 흔들린다.
      expect(parts[1].type).toBe('image/png');
    });

    it('호출마다 새 FormData 를 만든다 — 누적되면 두 번째 업로드에 첫 파일이 딸려 간다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt')]);
      await fileAdminService.uploadFiles([makeFile('b.png')]);

      expect(formDataOf(0)).not.toBe(formDataOf(1));
      expect(filePartsOf(formDataOf(1)).map((file) => file.name)).toEqual(['b.png']);
    });

    it('빈 배열이어도 조기 반환하지 않고 요청을 만든다 — 성공 판정을 클라이언트가 대신하지 않는다', async () => {
      // 두 호출부 모두 `files.length > 0` 을 먼저 확인한다. 여기서 0 같은 가짜 성공값을 만들어
      // 돌려주면 그 값이 그대로 atchFileSn 으로 저장된다 — 서버 400 으로 드러나는 편이 낫다.
      await fileAdminService.uploadFiles([]);

      expect(client.post).toHaveBeenCalledTimes(1);
      expect(postedPaths()).toEqual([BASE]);
      expect(filePartsOf(formDataOf(0))).toHaveLength(0);
    });
  });

  describe('헤더 및 config 전달', () => {
    it('config 없이 호출하면 multipart/form-data 헤더만 실린다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt')]);

      // config 를 생략해도 세 번째 인자는 undefined 가 아니다 — 헤더 강제가 항상 객체를 만든다.
      expect(client.post).toHaveBeenCalledWith(BASE, expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(client.post).not.toHaveBeenCalledWith(BASE, expect.any(FormData), undefined);
    });

    it('호출부가 지정한 Content-Type 을 multipart/form-data 로 덮어쓴다', async () => {
      // 리터럴이 spread 뒤에 오므로 항상 이긴다. 순서가 뒤집히면 컨트롤러의
      // consumes = MULTIPART_FORM_DATA_VALUE 와 어긋나 415 가 된다.
      await fileAdminService.uploadFiles([makeFile('a.txt')], {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(client.post).toHaveBeenCalledWith(BASE, expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(client.post).not.toHaveBeenCalledWith(BASE, expect.any(FormData), {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('호출부의 다른 헤더(Authorization)는 Content-Type 강제와 함께 보존된다', async () => {
      // SSR/서버 액션 경로는 쿠키에서 뽑은 Bearer 토큰을 헤더로 싣는다. 유실되면 401 이다.
      await fileAdminService.uploadFiles([makeFile('a.txt')], {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(client.post).toHaveBeenCalledWith(BASE, expect.any(FormData), {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'multipart/form-data',
        },
      });
    });

    it('timeout·signal 등 headers 밖의 config 필드가 유실되지 않는다', async () => {
      // 대용량 첨부는 기본 15초 timeout 을 넘긴다. 화면 이탈 시 취소하려면 signal 도 필요하다.
      const { signal } = new AbortController();

      await fileAdminService.uploadFiles([makeFile('big.zip')], { timeout: 120000, signal });

      expect(client.post).toHaveBeenCalledWith(BASE, expect.any(FormData), {
        timeout: 120000,
        signal,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });

    it('호출부 config 객체를 변형하지 않는다 — 재사용되는 config 가 multipart 로 오염되면 안 된다', async () => {
      const config: AxiosRequestConfig = {
        timeout: 30000,
        headers: { Authorization: 'Bearer test-token' },
      };

      await fileAdminService.uploadFiles([makeFile('a.txt')], config);

      // spread 로 새 객체를 만들므로 원본에는 Content-Type 이 주입되지 않는다.
      expect(config.headers).toEqual({ Authorization: 'Bearer test-token' });
      expect(config).toEqual({ timeout: 30000, headers: { Authorization: 'Bearer test-token' } });
    });

    it('config 를 넘겨도 본문 구성은 달라지지 않는다 — 헤더 축과 본문 축은 독립이다', async () => {
      await fileAdminService.uploadFiles([makeFile('a.txt'), makeFile('b.png')], { timeout: 5000 });

      expect(filePartsOf(formDataOf(0)).map((file) => file.name)).toEqual(['a.txt', 'b.png']);
    });
  });

  describe('응답·오류 전달', () => {
    it('서버가 채번한 atchFileSn 을 가공 없이 반환한다', async () => {
      client.post.mockResolvedValueOnce(101);

      await expect(fileAdminService.uploadFiles([makeFile('a.txt')])).resolves.toBe(101);
    });

    it('0 도 폴백 없이 그대로 반환한다 — falsy 라고 기본값으로 바꿔치지 않는다', async () => {
      // 호출부(BannerAdminClient)가 `if (uploadedFileSn)` 로 판단하므로 여기서 값을 만들어 내면
      // "실패해서 0" 과 "서버가 준 0" 이 구별 불가능해진다.
      client.post.mockResolvedValueOnce(0);

      await expect(fileAdminService.uploadFiles([makeFile('a.txt')])).resolves.toBe(0);
    });

    it('업로드 실패를 삼키지 않고 그대로 전파한다 — 게시글이 첨부 없이 등록되면 안 된다', async () => {
      // 용량 초과·확장자 거부는 서버가 판정한다. 여기서 삼키면 호출부의 catch 가 돌지 않아
      // 첨부가 빠진 채로 다음 단계(게시글 등록)가 진행된다.
      const failure = new Error('허용 용량을 초과했습니다');
      client.post.mockRejectedValueOnce(failure);

      await expect(fileAdminService.uploadFiles([makeFile('big.zip')])).rejects.toBe(failure);
    });
  });

  describe('서비스 표면 (surface)', () => {
    it('노출 메서드는 uploadFiles 하나뿐이다 — 목록/삭제 재도입은 백엔드 매핑 신설이 먼저다', () => {
      // getFiles/deleteFile 은 2026-08-05 에 제거됐다(각각 404/405, 앱 호출부 0개소).
      // FE 메서드만 되살리면 '계약이 있다는 착시' 가 다시 생긴다 — 그때 이 단언이 red 가 된다.
      const prototype: object = Object.getPrototypeOf(fileAdminService);

      expect(Object.getOwnPropertyNames(prototype).sort()).toEqual(['constructor', 'uploadFiles']);
    });
  });
});
