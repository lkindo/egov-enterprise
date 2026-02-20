package com.company.project.domain.board;

import com.company.project.domain.TestQuerydslConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BoardRepository JPA ???뮞??
 */
@DataJpaTest
@Import(TestQuerydslConfig.class)
@ActiveProfiles("test")
class BoardRepositoryTest {

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    @Test
    @DisplayName("野껊슣???筌띾뜆???????獄?鈺곌퀬?????뮞??)
    void saveBoardMaster() {
        // given
        BoardMaster master = BoardMaster.builder()
                .bbsId("TEST_BBS_001")
                .bbsNm("???뮞??野껊슣???)
                .bbsTyCode("BBST01")
                .bbsAttrbCode("BBSA01")
                .frstRegisterId("SYSTEM")
                .build();

        // when
        BoardMaster saved = java.util.Objects
                .requireNonNull(boardMasterRepository.save(java.util.Objects.requireNonNull(master)));

        // then
        assertThat(saved.getBbsId()).isEqualTo("TEST_BBS_001");
        assertThat(saved.getBbsNm()).isEqualTo("???뮞??野껊슣???);
    }

    @Test
    @DisplayName("野껊슣?녻눧?????獄?鈺곌퀬?????뮞??)
    void saveBoard() {
        // given
        BoardMaster master = java.util.Objects.requireNonNull(boardMasterRepository.save(
                java.util.Objects.requireNonNull(BoardMaster.builder()
                        .bbsId("TEST_BBS_002")
                        .bbsNm("???뮞??野껊슣???")
                        .bbsTyCode("BBST01")
                        .bbsAttrbCode("BBSA01")
                        .frstRegisterId("SYSTEM")
                        .build())));

        Board board = Board.builder()
                .bbsId(java.util.Objects.requireNonNull(master.getBbsId()))
                .nttSj("???뮞????뺛걠")
                .nttCn("???뮞????곸뒠")
                .ntceBgnde("20230101")
                .ntceEndde("99991231")
                .ntcrId("TESTER")
                .ntcrNm("Tester")
                .password("password")
                .build();

        // when
        Board saved = java.util.Objects.requireNonNull(boardRepository.save(java.util.Objects.requireNonNull(board)));

        // then
        assertThat(saved.getNttSj()).isEqualTo("???뮞????뺛걠");
        assertThat(saved.getNttCn()).isEqualTo("???뮞????곸뒠");
    }
}
