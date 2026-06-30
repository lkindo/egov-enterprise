package nuri.business.core.softdelete;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardRepository;
import nuri.business.support.BusinessIntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;


import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
public class SoftDeleteDynamicTest extends BusinessIntegrationTestSupport {

    @Autowired
    private SoftDeleteTestService testService;

    @Autowired
    private BoardRepository boardRepository;

    @BeforeEach
    void setUp() {
        boardRepository.deleteAll(); // 기존 데이터 정화

        // 테스트용 데이터 저장 (use_yn = 'Y' 1개, use_yn = 'N' 1개)
        Board activeBoard = Board.builder()
                .pstId("SOFT_DEL_Y")
                .bbsId("BBS_TEST")
                .pstTtl("Active Post")
                .pstCn("Content")
                .useYn("Y")
                .build();

        Board deletedBoard = Board.builder()
                .pstId("SOFT_DEL_N")
                .bbsId("BBS_TEST")
                .pstTtl("Deleted Post")
                .pstCn("Content")
                .useYn("N")
                .build();

        boardRepository.save(activeBoard);
        boardRepository.save(deletedBoard);
    }

    @Test
    @DisplayName("일반 서비스 조회 시 삭제된 데이터는 조회되지 않는다")
    void normalServiceFiltering() {
        List<Board> results = testService.getAllBoards();
        
        // use_yn = 'Y'인 데이터 1개만 조회되어야 함
        assertThat(results)
                .extracting(b -> b.getPstId())
                .containsExactly("SOFT_DEL_Y");
    }

    @Test
    @DisplayName("@DisableSoftDelete 사용 시 삭제된 데이터도 함께 조회된다")
    void disableSoftDeleteFiltering() {
        List<Board> results = testService.getAllBoardsWithDeleted();
        
        // use_yn = 'Y', 'N' 둘 다 조회되어야 함
        assertThat(results)
                .extracting(b -> b.getPstId())
                .containsExactlyInAnyOrder("SOFT_DEL_Y", "SOFT_DEL_N");
    }
}
