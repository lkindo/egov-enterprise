import { act, Suspense } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REPO_ROOT } from '@/test-utils/projection';

/**
 * [스크랩 슬롯] 게시글 상세의 '스크랩' 버튼은 스크랩 기능이 post-actions 슬롯에 기여한다. 이 시험은 **실제 레지스트리**로 게시글
 * 상세를 렌더해 원본 조립 경로(레지스트리 → 기여 → 쓰기 → 서비스)를 본다. 스크랩 디렉터리에 두어 스크랩과 함께 빠진다 — 게시판
 * 쪽 호스트 계약(잠금·토스트·완료 표시)은 게시판 시험이 가짜 기여로 본다. 게시글 상세의 스크랩을 누르는 E2E 는 없다.
 *
 * 노출 행렬(스크랩 슬롯 S3): 버튼은 스크랩 등록 권한(SCRAP_CREATE)이 있는 주체에게만 보인다. 권한 상태를 모르면(로그아웃·권한 버전
 * 없음·빈 권한 버전) 보이지 않는다. 판정은 목으로 막지 않는다 — 실제 레지스트리와 canPermission 을 그대로 탄다. 노출일 뿐 인가가
 * 아니다 — 저장 API 는 서버가 같은 권한으로 막는다(H3).
 */
type Subject = null | { id: string; esntlId: string; role: string; permissions: string[]; authorizationVersion?: string };
// 추천 단추는 추천 권한(BOARD_LIKE)으로 보인다(ADR-0040 결정 6) — 순서 시험이 추천 단추를 쓰므로 함께 준다.
const BOARD_PERMISSIONS = ['BOARD_UPDATE', 'BOARD_DELETE', 'BOARD_LIKE'];
const SUBJECTS = {
  granted: { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: [...BOARD_PERMISSIONS, 'SCRAP_CREATE'], authorizationVersion: 'v1' },
  // 근접 오답: 스크랩 조회·수정·삭제와 대행 권한은 있지만 등록 권한이 없다. 저장 API 는 정확히 SCRAP_CREATE 를 요구한다.
  denied: {
    id: 'writer', esntlId: 'owner-id', role: 'USER', authorizationVersion: 'v1',
    permissions: [...BOARD_PERMISSIONS, 'SCRAP_READ', 'SCRAP_UPDATE', 'SCRAP_DELETE', 'SCRAP_READ_ALL', 'SCRAP_UPDATE_ALL'],
  },
  signedOut: null,
  noVersion: { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: [...BOARD_PERMISSIONS, 'SCRAP_CREATE'] },
  emptyVersion: { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: [...BOARD_PERMISSIONS, 'SCRAP_CREATE'], authorizationVersion: '' },
} satisfies Record<string, Subject>;
type SubjectCase = keyof typeof SUBJECTS;

const mocks = vi.hoisted(() => ({
  createScrap: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  searchParams: new Map<string, string>(),
  user: null as unknown,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => mocks.searchParams.get(key) ?? null }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { likePost: vi.fn(), markQuestionSolved: vi.fn() } }));
vi.mock('@/app/actions/boardActions', () => ({ deleteBoardArticle: vi.fn() }));
vi.mock('@/services/business/user/ScrapService', () => ({ scrapService: { createScrap: mocks.createScrap } }));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({ knowledgeService: { getArticle: vi.fn() } }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: { getFileList: vi.fn(), downloadFile: vi.fn() } }));
vi.mock('@/components/features/comment/CommentSection', () => ({ default: () => <div data-testid="comments" /> }));
vi.mock('@/components/features/satisfaction/SatisfactionSection', () => ({ default: () => <div data-testid="satisfaction" /> }));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  mutationOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData }: { initialData?: unknown }) => ({ data: initialData, isError: false, refetch: vi.fn() }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { BoardDetailClient } from '@/app/admin/community/boards/detail/BoardDetailClient';
import scrapPostActions from '@/extensions/scrap/post-actions';
import { scrapCreateFormSchema, scrapEditFormSchema } from '../scrap-form-validation';

async function renderDetail(pstTtl = '보존할 게시글') {
  const dataPromise = Promise.resolve({
    article: { pstSn: 31, pstTtl, pstCn: '본문', userId: 'owner-id', likeCnt: 2, inqCnt: 3 },
    masterInfo: { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST', requiredEditPermissions: [] },
    initialComments: [],
    fetchError: null,
  } as never);
  const tree = () => (
    <Suspense fallback={<div>loading</div>}>
      <BoardDetailClient dataPromise={dataPromise} />
    </Suspense>
  );
  let view: ReturnType<typeof render> | undefined;
  await act(async () => {
    view = render(tree());
    await dataPromise;
  });
  return { rerender: () => act(() => { view?.rerender(tree()); }) };
}

const scrapButton = () => screen.queryByRole('button', { name: '게시글 스크랩' });

describe('게시글 상세의 스크랩 버튼(스크랩 기여 조립)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams.clear();
    mocks.searchParams.set('bbsId', 'BBS-1');
    mocks.searchParams.set('pstSn', '31');
    mocks.createScrap.mockResolvedValue(1);
    // 기본 주체는 권한이 있는 사용자다 — 아래 조립 시험이 버튼을 찾는다.
    mocks.user = SUBJECTS.granted;
  });

  it.each(Object.keys(SUBJECTS) as SubjectCase[])('노출 행렬 — 주체 %s', async (subject) => {
    mocks.user = SUBJECTS[subject];
    await renderDetail();
    // 화면이 그려진 뒤(게시글 번호)에 스크랩 버튼의 유무를 본다. 추천 단추는 권한 상태를 아는 주체에게만 보여 기준으로 쓰지 않는다.
    await screen.findByText(/게시글 번호:/);
    expect(scrapButton() !== null).toBe(subject === 'granted');
  });

  it('권한 상태가 정해지면 다시 렌더할 때 버튼이 나타나고, 권한이 회수되면 사라진다', async () => {
    mocks.user = SUBJECTS.noVersion;
    const view = await renderDetail();
    await screen.findByText(/게시글 번호:/);
    expect(scrapButton()).toBeNull();
    mocks.user = SUBJECTS.granted;
    view.rerender();
    expect(await screen.findByRole('button', { name: '게시글 스크랩' })).toBeEnabled();
    mocks.user = SUBJECTS.denied;
    view.rerender();
    expect(scrapButton()).toBeNull();
  });

  it('노출 술어는 저장 API 의 권한과 같고, 기본 그룹 셋이 모두 그 권한을 가진다', () => {
    const readConfig = (relative: string) => JSON.parse(readFileSync(path.join(REPO_ROOT, relative), 'utf8'));
    const bindings = readConfig('config/governance/authorization-policies.json').operationBindings as Array<{
      method: string; handler: string; permission: string | null;
    }>;
    // 기여의 쓰기(submitPostScrap)가 부르는 연산(ScrapService.createScrap → POST /api/v1/scraps).
    const called = bindings.filter((row) => row.method === 'POST' && row.handler.endsWith('.ScrapApiController#createScrap'));
    expect(called).toHaveLength(1);
    expect(called[0].permission).toBe('SCRAP_CREATE');
    expect(scrapPostActions.map((entry) => entry.visibleWhen)).toEqual([{ permissions: [called[0].permission] }]);
    // 기본 그룹은 모두 이 권한을 가져 화면이 바뀌지 않는다. 기본 그룹에서 빠지면 이 노출 결정을 다시 본다.
    const catalog = readConfig('config/governance/permission-catalog.json') as { permissions: Array<{ code: string; defaultGroups: string[] }> };
    expect(catalog.permissions.find((row) => row.code === 'SCRAP_CREATE')?.defaultGroups).toEqual(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER']);
  });

  it('추천과 삭제 사이에 스크랩 버튼이 있다', async () => {
    await renderDetail();
    await screen.findByRole('button', { name: '게시글 스크랩' });

    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')).filter(Boolean);
    expect(names).toContain('게시글 추천');
    expect(names.indexOf('게시글 추천')).toBeLessThan(names.indexOf('게시글 스크랩'));
    expect(names.indexOf('게시글 스크랩')).toBeLessThan(names.indexOf('게시글 삭제'));
    expect(screen.getByRole('button', { name: '게시글 스크랩' })).toHaveTextContent('스크랩');
  });

  it('정본 경로·잘린 제목으로 저장하고 스크랩 목록을 다시 읽은 뒤 이번 방문에서 잠근다', async () => {
    const longTitle = '가'.repeat(150);
    await renderDetail(longTitle);

    fireEvent.click(await screen.findByRole('button', { name: '게시글 스크랩' }));

    await waitFor(() => expect(mocks.createScrap).toHaveBeenCalledTimes(1));
    // scrapNm 은 물리 컬럼 varchar(100) — 사용자가 길이를 조절할 수 있는 입력이 아니므로 잘라 보낸다.
    expect(mocks.createScrap).toHaveBeenCalledWith({
      scrapNm: '가'.repeat(100),
      scrapUrl: '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31',
      scrapExpln: `테스트 게시판 - ${'가'.repeat(100)}`,
      useYn: 'Y',
    });
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['scraps', 'list'] }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글을 스크랩 보관함에 저장했습니다.', 'success'));
    const done = await screen.findByRole('button', { name: '게시글 스크랩됨' });
    expect(done).toBeDisabled();
    expect(done).toHaveTextContent('스크랩됨');
  });

  it('nttId 별칭으로 들어와도 pstSn 정본 경로로 저장한다', async () => {
    mocks.searchParams.delete('pstSn');
    mocks.searchParams.set('nttId', '31');
    await renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '게시글 스크랩' }));

    await waitFor(() => expect(mocks.createScrap).toHaveBeenCalledWith(expect.objectContaining({
      scrapUrl: '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31',
    })));
  });

  it('게시글에서 생성한 정본 URL은 그대로 이름·설명 편집 계약에 다시 사용할 수 있다', async () => {
    await renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: '게시글 스크랩' }));
    await waitFor(() => expect(mocks.createScrap).toHaveBeenCalledTimes(1));
    const created = mocks.createScrap.mock.calls[0][0];
    const edited = { ...created, scrapNm: '다시 볼 게시글', scrapExpln: '나중에 참고할 설명' };

    expect(created.scrapUrl).toBe('/admin/community/boards/detail?bbsId=BBS-1&pstSn=31');
    expect(scrapEditFormSchema.safeParse(edited).success).toBe(true);
    // 게시글 동작이 만든 내부 주소의 편집 허용은 신규 수동 등록 규칙을 넓히지 않는다.
    expect(scrapCreateFormSchema.safeParse(edited).success).toBe(false);
  });

  it('서버 사유가 없는 실패는 스크랩 문구로 알리고 다시 누를 수 있다', async () => {
    mocks.createScrap.mockRejectedValueOnce(new Error('Request failed with status code 500'));
    await renderDetail();
    const scrap = await screen.findByRole('button', { name: '게시글 스크랩' });

    fireEvent.click(scrap);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('스크랩 저장 중 오류가 발생했습니다.', 'error'));
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    await waitFor(() => expect(scrap).toBeEnabled());
  });
});
