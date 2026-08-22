import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import CommunityBoardsDetailClient from '../[id]/CommunityBoardsDetailClient';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { fileAdminService } from '@/services/foundation/system/FileAdminService';

/**
 * 🔗 게시글 첨부파일 배선 — **붙인 파일이 실제로 전송되는가.**
 *
 * [왜 필요한가 — 2026-08-11 확인된 결함]
 * 종전 구현은 `const [, setFiles] = useState<File[]>([])` 였다. **값 슬롯이 아예 버려져 있어**
 * 첨부한 파일이 어디에도 쓰이지 않았고, `createPost(formData)` 에도 실리지 않았다.
 * 그런데 사용자에게는 성공으로 보인다:
 *   · StandardFileUploader 는 `onUpload` 가 없으면 **가짜 진행 게이지**를 완료까지 돌린다.
 *   · 등록 후에는 '성공적으로 등록되었습니다.' 토스트가 뜬다.
 * 즉 **첨부가 조용히 증발**한다. 오류도 경고도 없다.
 *
 * 백엔드는 지원하고 있었다 — `BoardSaveRequest.atchFileSn` 가 있고 `Board.atch_file_sn` 컬럼도 있다.
 * 같은 업로더를 쓰는 배너 화면은 저장 시점에 실제로 업로드한다. **게시글만 배선이 빠져 있었다.**
 *
 * [왜 단위 테스트인가]
 * "파일이 전송되는가" 는 **서비스 호출 인자**로 결정적으로 판정할 수 있다. E2E 로만 두면
 * 업로드 저장소·파일 시스템까지 얽혀 실패 원인이 흐려지고, 무엇보다 이 결함의 본질인
 * "값이 어디에도 전달되지 않는다" 를 가장 직접적으로 보는 층이 여기다.
 */

// 등록 후 이동만 이 테스트 범위이므로 라우터 push 만 관측한다.
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/admin/community/boards/insert-board-article',
    useSearchParams: () => new URLSearchParams(),
}));

// 첨부 배선 테스트에 공용 PageHeader → DynamicBreadcrumb 메뉴 조회를 섞지 않는다.
vi.mock('@/app/components/layout/page-header', () => ({
    PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
        <header><h1>{title}</h1>{actions}</header>
    ),
}));

vi.mock('@/services/business/user/board/BoardUserService', () => ({
    boardUserService: { createPost: vi.fn() },
}));

vi.mock('@/services/foundation/system/FileAdminService', () => ({
    fileAdminService: { uploadFiles: vi.fn() },
}));

// 토스트·확인모달·자동저장은 이 테스트의 관심사가 아니다. 확인모달은 항상 승인으로 둔다.
vi.mock('@/app/components/ui/toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({
    useConfirm: () => vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/hooks/use-auto-save', () => ({
    useAutoSave: () => ({ clear: vi.fn() }),
}));

// 업로더는 **계약대로** 스텁한다: 파일이 선택되면 onFilesChange(File[]) 를 부른다.
//   검증 대상은 "업로더가 어떻게 그리는가" 가 아니라 "클라이언트가 그 파일을 전송하는가" 다.
//   (실제 컴포넌트는 jsdom 에서 내부 렌더가 깨진다 — 그 자체는 이 테스트의 관심사가 아니다.)
//   ⚠ 따라서 이 테스트는 업로더가 onFilesChange 를 부른다는 사실 자체는 증명하지 않는다.
//     그쪽은 standard-file-uploader 의 몫이다.
vi.mock('@/app/components/ui/standard-file-uploader', () => ({
    StandardFileUploader: ({ onFilesChange }: { onFilesChange?: (files: File[]) => void }) => (
        <input
            type="file"
            aria-label="파일 첨부 선택"
            onChange={(e) => onFilesChange?.(Array.from(e.target.files ?? []))}
        />
    ),
}));

const mockedBoard = vi.mocked(boardUserService);
const mockedFile = vi.mocked(fileAdminService);

/** 파일을 첨부하고 제목을 채운 뒤 등록을 누른다. */
async function writePostWithAttachment(user: ReturnType<typeof userEvent.setup>, file: File) {
    await user.type(screen.getByRole('textbox', { name: /제목/ }), '첨부 검증용 게시글');

    // StandardFileUploader 의 입력은 시각적으로 숨겨져 있으나 DOM 에는 존재한다.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput, '파일 입력이 렌더되지 않았다').toBeTruthy();
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /등록/ }));
}

describe('게시글 첨부파일 배선', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedBoard.createPost.mockResolvedValue({} as never);
        mockedFile.uploadFiles.mockResolvedValue(101);
    });

    it('첨부한 파일을 업로드하고 그 식별자를 게시글에 실어 보낸다', async () => {
        const user = userEvent.setup();
        render(<CommunityBoardsDetailClient />);

        const file = new File(['hello'], 'evidence.txt', { type: 'text/plain' });
        await writePostWithAttachment(user, file);

        // ① 업로드가 실제로 호출돼야 한다. 종전에는 파일이 버려져 한 번도 불리지 않았다.
        await waitFor(() => expect(mockedFile.uploadFiles).toHaveBeenCalledTimes(1));
        expect(mockedFile.uploadFiles.mock.calls[0][0]).toHaveLength(1);
        expect(mockedFile.uploadFiles.mock.calls[0][0][0].name).toBe('evidence.txt');

        // ② 받은 식별자가 게시글 본문에 실려야 한다 — 업로드만 하고 안 실으면 첨부는 여전히 사라진다.
        await waitFor(() => expect(mockedBoard.createPost).toHaveBeenCalledTimes(1));
        expect(mockedBoard.createPost.mock.calls[0][0]).toMatchObject({ atchFileSn: 101 });
    });

    it('첨부가 없으면 업로드를 호출하지 않는다 (빈 업로드 회귀 방어)', async () => {
        const user = userEvent.setup();
        render(<CommunityBoardsDetailClient />);

        await user.type(screen.getByRole('textbox', { name: /제목/ }), '첨부 없는 게시글');
        await user.click(screen.getByRole('button', { name: /등록/ }));

        await waitFor(() => expect(mockedBoard.createPost).toHaveBeenCalledTimes(1));
        expect(mockedFile.uploadFiles, '첨부가 없는데 업로드를 호출했다').not.toHaveBeenCalled();
        expect(mockedBoard.createPost.mock.calls[0][0].atchFileSn).toBeUndefined();
    });
});
