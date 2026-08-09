/**
 * codeActions 서버 액션 테스트.
 *
 * [2026-08-09 신설] 이 파일은 커버리지 0% 였다(83줄 전량 미커버).
 *
 * 서버 액션은 쿠키에서 accessToken 을 꺼내 백엔드 호출에 실어 나르는 **인증 경계 코드**다.
 * 그런데 이 계층에서 조용히 틀어질 수 있는 것이 셋 있다:
 *
 *   ① 인증 헤더가 안 붙으면 → 백엔드가 401 을 낸다. 화면은 "저장 실패" 만 보여준다.
 *   ② isNew 분기가 뒤집히면 → **수정이 생성으로**(중복 행) 또는 **생성이 수정으로**(대상 없음) 간다.
 *   ③ revalidatePath 가 빠지면 → 저장은 됐는데 목록이 옛 데이터를 보여준다. 사용자는 실패로 읽는다.
 *
 * 셋 다 예외가 나지 않아서 타입 검사·빌드로는 잡히지 않는다. 여기서 고정한다.
 */

vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { saveCodeDetail, deleteCodeDetail, saveCmmnCodeHierarchyAction } from '../codeActions';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    createDetailCode: vi.fn(),
    updateDetailCode: vi.fn(),
    deleteDetailCode: vi.fn(),
    updateCmmnCodeHierarchy: vi.fn(),
  },
}));

const CODE_PATH = '/admin/system/common-code';

/** accessToken 쿠키가 있는 상태로 만든다. */
function withToken(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === 'accessToken' && token ? { name, value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe('codeActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withToken('TOKEN-123');
  });

  describe('saveCodeDetail', () => {
    it('신규 저장은 create 를 부른다 (isNew 미지정은 신규로 본다)', async () => {
      const result = await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1', dtlCdNm: '이름' });

      expect(codeAdminService.createDetailCode).toHaveBeenCalledTimes(1);
      expect(codeAdminService.updateDetailCode).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: '상세 코드가 저장되었습니다.' });
    });

    it('isNew=false 면 update 를 부르고 키를 인자로 넘긴다', async () => {
      // 분기가 뒤집히면 수정이 생성이 되어 **PK 중복**이거나 중복 행이 된다.
      await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1', dtlCdNm: '수정', isNew: false });

      expect(codeAdminService.createDetailCode).not.toHaveBeenCalled();
      expect(codeAdminService.updateDetailCode).toHaveBeenCalledTimes(1);
      const [cdId, dtlCd] = vi.mocked(codeAdminService.updateDetailCode).mock.calls[0];
      expect(cdId).toBe('G1');
      expect(dtlCd).toBe('D1');
    });

    it('isNew 플래그는 백엔드로 전송되지 않는다', async () => {
      await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1', dtlCdNm: '이름', isNew: true });

      const [payload] = vi.mocked(codeAdminService.createDetailCode).mock.calls[0];
      // 화면 전용 플래그가 DTO 에 섞여 나가면 백엔드가 모르는 필드를 받는다.
      expect(payload).not.toHaveProperty('isNew');
      expect(payload).toMatchObject({ cdId: 'G1', dtlCd: 'D1', dtlCdNm: '이름' });
    });

    it('accessToken 을 Authorization 헤더로 전달한다', async () => {
      await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1' });

      const config = vi.mocked(codeAdminService.createDetailCode).mock.calls[0][1];
      // 헤더가 빠지면 백엔드가 401 을 내는데, 화면에는 "저장 실패" 로만 보인다.
      expect(config).toEqual({ headers: { Authorization: 'Bearer TOKEN-123' } });
    });

    it('토큰이 없으면 빈 설정으로 호출한다 (undefined 헤더를 만들지 않는다)', async () => {
      withToken(undefined);

      await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1' });

      const config = vi.mocked(codeAdminService.createDetailCode).mock.calls[0][1];
      expect(config).toEqual({});
    });

    it('저장에 성공하면 목록 경로를 재검증한다', async () => {
      await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1' });

      // 빠지면 저장은 됐는데 목록이 옛 데이터를 보여준다 — 사용자는 실패로 읽는다.
      expect(revalidatePath).toHaveBeenCalledWith(CODE_PATH);
    });

    it('백엔드 오류는 throw 하지 않고 메시지로 돌려준다', async () => {
      vi.mocked(codeAdminService.createDetailCode).mockRejectedValueOnce({
        response: { data: { message: '중복된 코드입니다.' } },
      });

      const result = await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1' });

      // 서버 액션이 throw 하면 Next 가 500 을 내고 사용자는 이유를 못 본다.
      expect(result.success).toBe(false);
      expect(result.message).toBe('중복된 코드입니다.');
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('메시지 없는 오류는 기본 문구로 대체한다', async () => {
      vi.mocked(codeAdminService.createDetailCode).mockRejectedValueOnce({});

      const result = await saveCodeDetail(null, { cdId: 'G1', dtlCd: 'D1' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('저장 중 오류 발생');
    });
  });

  describe('deleteCodeDetail', () => {
    it('키 두 개를 그대로 넘기고 목록을 재검증한다', async () => {
      const result = await deleteCodeDetail(null, { cdId: 'G1', dtlCd: 'D1' });

      expect(codeAdminService.deleteDetailCode).toHaveBeenCalledWith(
        'G1',
        'D1',
        { headers: { Authorization: 'Bearer TOKEN-123' } }
      );
      expect(revalidatePath).toHaveBeenCalledWith(CODE_PATH);
      expect(result.success).toBe(true);
    });

    it('삭제 실패는 메시지로 돌려주고 재검증하지 않는다', async () => {
      vi.mocked(codeAdminService.deleteDetailCode).mockRejectedValueOnce({
        response: { data: { message: '참조 중인 코드입니다.' } },
      });

      const result = await deleteCodeDetail(null, { cdId: 'G1', dtlCd: 'D1' });

      expect(result).toEqual({ success: false, message: '참조 중인 코드입니다.' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('saveCmmnCodeHierarchyAction', () => {
    it('코드그룹만 전송한다 — 분류는 항상 루트라 이동 대상이 아니다', async () => {
      await saveCmmnCodeHierarchyAction([
        { id: 'G1', parentId: 'CLS1', type: 'group' },
        { id: 'CLS1', parentId: undefined, type: 'classification' },
        { id: 'G2', parentId: 'CLS2', type: 'group' },
      ] as never);

      const [payload] = vi.mocked(codeAdminService.updateCmmnCodeHierarchy).mock.calls[0];
      // 필터가 뒤집히면 분류가 그룹으로 이동 요청돼 계층이 깨진다.
      expect(payload).toEqual([
        { cdId: 'G1', clsfCd: 'CLS1' },
        { cdId: 'G2', clsfCd: 'CLS2' },
      ]);
    });

    it('parentId 가 없는 그룹은 제외한다 — 트리에 표현될 수 없다', async () => {
      await saveCmmnCodeHierarchyAction([
        { id: 'G1', parentId: 'CLS1', type: 'group' },
        { id: 'G2', parentId: undefined, type: 'group' },
        { id: 'G3', parentId: '', type: 'group' },
      ] as never);

      const [payload] = vi.mocked(codeAdminService.updateCmmnCodeHierarchy).mock.calls[0];
      expect(payload).toEqual([{ cdId: 'G1', clsfCd: 'CLS1' }]);
    });

    it('보낼 것이 없으면 호출하지 않고 성공으로 끝낸다', async () => {
      const result = await saveCmmnCodeHierarchyAction([
        { id: 'CLS1', parentId: undefined, type: 'classification' },
      ] as never);

      // 빈 배열을 그대로 보내면 백엔드가 "전체 삭제" 로 해석할 여지가 있다.
      expect(codeAdminService.updateCmmnCodeHierarchy).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: '변경할 코드그룹이 없습니다.' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('성공하면 목록을 재검증한다', async () => {
      await saveCmmnCodeHierarchyAction([
        { id: 'G1', parentId: 'CLS1', type: 'group' },
      ] as never);

      expect(revalidatePath).toHaveBeenCalledWith(CODE_PATH);
    });

    it('실패는 메시지로 돌려준다', async () => {
      vi.mocked(codeAdminService.updateCmmnCodeHierarchy).mockRejectedValueOnce({});

      const result = await saveCmmnCodeHierarchyAction([
        { id: 'G1', parentId: 'CLS1', type: 'group' },
      ] as never);

      expect(result).toEqual({ success: false, message: '계층 구조 저장 중 오류 발생' });
    });
  });
});
