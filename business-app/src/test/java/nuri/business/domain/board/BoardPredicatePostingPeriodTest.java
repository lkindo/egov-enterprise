package nuri.business.domain.board;

import nuri.business.service.board.dto.PostingStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * [2026-10-01 결정 23·2026-10-23 ADR-0040 결정 3] 게시 기간(시작일·종료일) 조건이 목록·검색·통계 술어에 들어가는지 본다. 기준일이
 * 없으면(전체 열람 권한자) 조건이 없고, 있으면 시작했고 끝나지 않았거나 작성자 본인인 글만 남는다.
 */
class BoardPredicatePostingPeriodTest {

    @Test
    @DisplayName("기준일이 있으면 시작일 없음·기준일 이전 시작과 종료일 없음·기준일 이후 종료, 또는 작성자 본인만 남긴다")
    void bindsPostingPeriodWithOwnerException() {
        BoardSearchCondition condition = new BoardSearchCondition("BBS_01");
        condition.setPostingOpenOn("20261001");
        condition.setViewerEsntlId("ESNTL_A");

        String predicate = BoardPredicate.searchBoard(condition).toString();

        assertThat(predicate).contains("board.pstEndYmd is null").contains("board.pstEndYmd >= 20261001")
                .contains("board.pstBgngYmd is null").contains("board.pstBgngYmd <= 20261001")
                .contains("board.userId = ESNTL_A");
    }

    @Test
    @DisplayName("기준일이 없으면(전체 열람 권한자) 게시 기간 조건이 없다")
    void noPostingConditionWithoutOpenOn() {
        BoardSearchCondition condition = new BoardSearchCondition("BBS_01");
        condition.setSecretPostAdminOverride(true);

        assertThat(BoardPredicate.searchBoard(condition).toString())
                .doesNotContain("pstEndYmd").doesNotContain("pstBgngYmd");
    }

    @Test
    @DisplayName("postingWithin 은 시작 쪽과 종료 쪽 조건을 AND 로 묶는다")
    void postingWithinRequiresBothEnds() {
        String within = BoardPredicate.postingWithin("20261001").toString();

        assertThat(within).contains("board.pstEndYmd >= 20261001").contains("board.pstBgngYmd <= 20261001")
                .contains(" && ");
    }

    @Test
    @DisplayName("게시 상태 조건은 가시성과 독립으로 기준일(baseYmd)에 걸린다 — 조회 대행 권한자도 좁힌다")
    void postingStatusUsesBaseDateIndependentlyOfVisibility() {
        BoardSearchCondition condition = new BoardSearchCondition("BBS_01");
        condition.setSecretPostAdminOverride(true);
        condition.setBaseYmd("20261001");
        condition.setPostingStatus(PostingStatus.SCHEDULED);

        assertThat(BoardPredicate.searchBoard(condition).toString())
                .contains("board.pstBgngYmd <= 20261001").contains("!(");

        condition.setBaseYmd(null);
        assertThat(BoardPredicate.searchBoard(condition).toString())
                .as("기준일이 없으면 상태를 판정할 수 없어 조건을 걸지 않는다").doesNotContain("pstBgngYmd");
    }
}
