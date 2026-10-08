package nuri.business.service.board.attachment;

import nuri.business.service.file.AttachmentSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BoardAttachmentSourceContributor 단위 테스트")
class BoardAttachmentSourceContributorTest {

    /**
     * 게시판이 소유한 첨부 참조원의 정확한 집합이다. 자료 이용 기록은 게시글 첨부를 가리키는 게시판 데이터라
     * 게시판과 함께 남고 함께 빠져야 한다 — 다른 도메인이 따로 등록하면 그 도메인이 빠진 구성에서 참조원이 사라져,
     * 첨부 참조 판정이 자료 이용 기록을 보지 못한다.
     */
    @Test
    @DisplayName("게시글과 자료 이용 기록을 참조원으로 등록한다")
    void registersBoardOwnedSources() {
        assertThat(new BoardAttachmentSourceContributor().sources())
                .containsExactly(AttachmentSource.BOARD, AttachmentSource.DATA_USE_STATS);
    }
}
