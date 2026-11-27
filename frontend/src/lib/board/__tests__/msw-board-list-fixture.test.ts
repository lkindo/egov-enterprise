import { describe, expect, it } from 'vitest';
import { parseGeneratedOperationResponse } from '@/lib/api/generated-operation';
import { getBoardOptionsOperation, getPostsOperation } from '@/types/generated-operations';

/**
 * 공용 MSW 의 게시판 목록 fixture(src/mocks/handlers.ts)는 생성 응답 계약으로 읽혀야 한다(2026-10-23 ADR-0040 결정 3·10).
 * 게시 상태 어휘 밖의 값이나 계약 밖의 모양이면 여기서 깨진다. 게시판 기능의 계약이라 게시판 소유 경로에 둔다 — 게시판을 고르지 않은
 * 생성물에는 이 operation 이 없다(정밀 점검 API_CONTRACT_REFERENCE).
 */
describe('공용 MSW 게시판 목록 fixture 계약', () => {
  it('게시판 목록 fixture는 생성 응답 계약(게시 상태·버전 포함)으로 읽힌다', async () => {
    const response = await fetch('http://localhost:8080/api/v1/boards/BBSMSTR_000000000001');
    const body: unknown = await response.json();

    const page = parseGeneratedOperationResponse(getPostsOperation, body);
    expect(page.list).toHaveLength(1);
    expect(page.list?.[0]).toMatchObject({ pstSn: 1, postingStatus: 'POSTING', version: 0, pinned: false });
  });

  // [2026-11-27] 공용 처리기는 게시판 operation 을 import 할 수 없어(게시판을 뺀 생성물) 손으로 쓴 성공 JSON 으로 남는다 — 그 두
  //   고정물은 여기서 생성 계약으로 읽는다(src/test-utils/contract-response.test.ts 의 래칫 허용 목록).
  it('게시판 선택지 fixture는 생성 응답 계약(bare 배열)으로 읽힌다', async () => {
    const response = await fetch('http://localhost:8080/api/v1/boards/options');
    const body: unknown = await response.json();

    const options = parseGeneratedOperationResponse(getBoardOptionsOperation, body);
    expect(options).toEqual([{ bbsId: 'BBSMSTR_000000000001', bbsTtl: '공지사항' }]);
  });
});
