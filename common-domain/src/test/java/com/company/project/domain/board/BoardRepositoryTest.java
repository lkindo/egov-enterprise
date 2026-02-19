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
 * BoardRepository JPA 테스트
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
    @DisplayName("게시판 마스터 저장 및 조회 테스트")
    void saveBoardMaster() {
        // given
        BoardMaster master = BoardMaster.builder()
                .bbsId("TEST_BBS_001")
                .bbsNm("테스트 게시판")
                .bbsTyCode("BBST01")
                .bbsAttrbCode("BBSA01")
                .frstRegisterId("SYSTEM")
                .build();

        // when
        BoardMaster saved = java.util.Objects
                .requireNonNull(boardMasterRepository.save(java.util.Objects.requireNonNull(master)));

        // then
        assertThat(saved.getBbsId()).isEqualTo("TEST_BBS_001");
        assertThat(saved.getBbsNm()).isEqualTo("테스트 게시판");
    }

    @Test
    @DisplayName("게시물 저장 및 조회 테스트")
    void saveBoard() {
        // given
        BoardMaster master = java.util.Objects.requireNonNull(boardMasterRepository.save(
                java.util.Objects.requireNonNull(BoardMaster.builder()
                        .bbsId("TEST_BBS_002")
                        .bbsNm("테스트 게시판2")
                        .bbsTyCode("BBST01")
                        .bbsAttrbCode("BBSA01")
                        .frstRegisterId("SYSTEM")
                        .build())));

        Board board = Board.builder()
                .bbsId(java.util.Objects.requireNonNull(master.getBbsId()))
                .nttSj("테스트 제목")
                .nttCn("테스트 내용")
                .ntceBgnde("20230101")
                .ntceEndde("99991231")
                .ntcrId("TESTER")
                .ntcrNm("Tester")
                .password("password")
                .build();

        // when
        Board saved = java.util.Objects.requireNonNull(boardRepository.save(java.util.Objects.requireNonNull(board)));

        // then
        assertThat(saved.getNttSj()).isEqualTo("테스트 제목");
        assertThat(saved.getNttCn()).isEqualTo("테스트 내용");
    }
}
