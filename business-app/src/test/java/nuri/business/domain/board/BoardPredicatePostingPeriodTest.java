package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * [2026-10-01 결정 23] 게시 종료일 조건이 목록·검색·통계 술어에 들어가는지 본다. 기준일이 없으면(전체 열람 권한자)
 * 조건이 없고, 있으면 종료일이 비었거나 기준일 이후이거나 작성자 본인인 글만 남는다.
 */
class BoardPredicatePostingPeriodTest {

    @Test
    @DisplayName("기준일이 있으면 종료일 없음·기준일 이후·작성자 본인만 남긴다")
    void bindsPostingPeriodWithOwnerException() {
        BoardSearchCondition condition = new BoardSearchCondition("BBS_01");
        condition.setPostingOpenOn("20261001");
        condition.setViewerEsntlId("ESNTL_A");

        String predicate = BoardPredicate.searchBoard(condition).toString();

        assertThat(predicate).contains("board.pstEndYmd is null").contains("board.pstEndYmd >= 20261001")
                .contains("board.userId = ESNTL_A");
    }

    @Test
    @DisplayName("기준일이 없으면(전체 열람 권한자) 게시 종료일 조건이 없다")
    void noPostingConditionWithoutOpenOn() {
        BoardSearchCondition condition = new BoardSearchCondition("BBS_01");
        condition.setSecretPostAdminOverride(true);

        assertThat(BoardPredicate.searchBoard(condition).toString()).doesNotContain("pstEndYmd");
    }
}
