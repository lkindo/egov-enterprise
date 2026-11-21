package nuri.business.core.softdelete;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.support.BusinessIntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 논리 삭제는 질의마다 쓴 조건({@code useYn = 'Y'}, {@code includeDeleted})만으로 가린다(2026-11-21).
 *
 * <p>종전에는 서비스 경계 애스펙트가 Hibernate 필터를 켰다. 그런데 애스펙트가 트랜잭션보다 바깥에서 돌아 컨트롤러에서 들어온
 * 첫 서비스에서는 켜지 못하고, 그 트랜잭션에서 다른 서비스를 한 번 부른 뒤부터만 켜졌다 — 같은 질의가 호출 경로에 따라
 * 삭제 글을 보이기도 하고 감추기도 했고, 관리자 복구·감사 경로({@code includeDeleted})가 앞선 서비스 호출 뒤에는 빈 값이 됐다.
 */
@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
class SoftDeleteDynamicTest extends BusinessIntegrationTestSupport {

    private static final String BBS_ID = "BBS_SOFTDEL";

    private Long activeBoardId;
    private Long deletedBoardId;

    @Autowired
    private SoftDeleteTestService testService;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    @BeforeEach
    void setUp() {
        boardRepository.deleteAll();
        boardMasterRepository.save(BoardMaster.builder()
                .bbsId(BBS_ID)
                .bbsTtl("Soft delete board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("Y")
                .build());
        activeBoardId = boardRepository.save(Board.builder()
                .bbsId(BBS_ID).pstTtl("Active Post").pstCn("Content").useYn("Y").build()).getPstSn();
        deletedBoardId = boardRepository.save(Board.builder()
                .bbsId(BBS_ID).pstTtl("Deleted Post").pstCn("Content").useYn("N").build()).getPstSn();
    }

    @Test
    @DisplayName("관리자의 삭제 글 상세 조회는 앞서 다른 서비스를 불렀어도 삭제 글을 돌려준다")
    void includeDeletedDetailSurvivesAPriorServiceCall() {
        assertThat(testService.readIncludingDeletedAfterNestedCall(testService, BBS_ID, deletedBoardId))
                .hasValueSatisfying(detail -> assertThat(detail.getUseYn()).isEqualTo("N"));
    }

    @Test
    @DisplayName("조건이 없는 질의는 호출 경로와 무관하게 같은 행을 본다 — 숨은 필터가 없다")
    void unconditionalQuerySeesTheSameRowsOnEveryPath() {
        assertThat(testService.getAllBoards())
                .extracting(Board::getPstSn)
                .containsExactlyInAnyOrder(activeBoardId, deletedBoardId);
        assertThat(testService.getAllBoardsAfterNestedCall(testService))
                .extracting(Board::getPstSn)
                .containsExactlyInAnyOrder(activeBoardId, deletedBoardId);
    }

    @Test
    @DisplayName("일반 상세 조회는 질의의 조건으로 삭제 글을 감춘다")
    void activeDetailHidesDeletedPostsByItsOwnCondition() {
        assertThat(boardRepository.findActiveArticleDetail(BBS_ID, activeBoardId)).isPresent();
        assertThat(boardRepository.findActiveArticleDetail(BBS_ID, deletedBoardId)).isEmpty();
    }
}
