import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardMakerWizard } from '../BoardMakerWizard';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { createBoard: vi.fn() },
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { createMenu: vi.fn() },
}));
vi.mock('../BoardPreview', () => ({ BoardPreview: () => null }));

/**
 * [2026-08-29] 종전 이 파일은 '댓글 사용 여부'·'파일 첨부 여부' 스위치가 라벨·설명에 제대로
 * 결속되고 키보드로 전환되는지를 검사했다. 그 검사는 접근성 면에서 옳았지만, **그 스위치가
 * 아무것도 하지 않는다는 사실은 검사하지 않았다** — 접근성만 완벽한 거짓말이었다.
 *
 * 실측: `ansPsbltyYn`·`fileAtchPsbltyYn` 은 저장소 전체에서 조건문에 쓰이는 곳이 0건이다
 * (엔티티 필드·DTO·프로젝션·저장 패스스루뿐). 게시글 상세 `BoardDetailClient.tsx` 는
 * `<CommentSection>` 을 분기 없이 렌더하고, `CommentApiController.createComment` 는 게시판
 * 마스터를 조회조차 하지 않는다. 즉 관리자가 댓글을 껐다고 믿은 게시판에서도 모든 인증
 * 사용자가 댓글을 쓸 수 있었다. 게다가 `ans_psblty_yn` 은 댓글 플래그가 아니라 '답변가능여부'
 * 이며(V2_0__baseline.sql), 그 답글 어포던스도 이 웨이브의 4fdcd8133 에서 이미 걷어냈다.
 *
 * 그래서 스위치를 제거했고, 검사를 지우는 대신 **부재를 고정하는 계약으로 뒤집는다.**
 * 집행 경로(서버 검사 + 화면 게이트)를 만들면 그때 스위치와 접근성 검사를 함께 되살린다.
 */
describe('BoardMakerWizard 는 집행되지 않는 게시판 옵션을 묻지 않는다', () => {
  it('댓글·첨부 스위치가 화면에 없다', () => {
    render(<BoardMakerWizard />);

    // 1단계는 초기 화면이므로 렌더 직후 바로 보인다 — 단계 이동 없이 검사할 수 있다.
    expect(screen.getByText('게시판 명칭')).toBeInTheDocument();

    expect(screen.queryByRole('switch', { name: '댓글 사용 여부' })).toBeNull();
    expect(screen.queryByRole('switch', { name: '파일 첨부 여부' })).toBeNull();
    // 라벨을 바꿔 되살리는 우회도 막는다 — 이 화면에는 스위치 자체가 없다.
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
  });
});
