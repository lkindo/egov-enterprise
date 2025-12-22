package com.company.project.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BoardRepository JPA 테스트
 */
@DataJpaTest
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
                .build();

        // when
        BoardMaster saved = boardMasterRepository.save(master);

        // then
        assertThat(saved.getBbsId()).isEqualTo("TEST_BBS_001");
        assertThat(saved.getBbsNm()).isEqualTo("테스트 게시판");
    }

    @Test
    @DisplayName("게시물 저장 및 조회 테스트")
    void saveBoard() {
        // given
        BoardMaster master = boardMasterRepository.save(
                BoardMaster.builder()
                        .bbsId("TEST_BBS_002")
                        .bbsNm("테스트 게시판2")
                        .bbsTyCode("BBST01")
                        .build());

        Board board = Board.builder()
                .id(1L)
                .boardMaster(master)
                .nttSj("테스트 제목")
                .nttCn("테스트 내용")
                .build();

        // when
        Board saved = boardRepository.save(board);

        // then
        assertThat(saved.getNttSj()).isEqualTo("테스트 제목");
        assertThat(saved.getNttCn()).isEqualTo("테스트 내용");
    }
}
