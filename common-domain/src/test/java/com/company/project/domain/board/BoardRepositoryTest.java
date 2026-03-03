package com.company.project.domain.board;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("BoardRepository 테스트")
class BoardRepositoryTest {

        @Autowired
        private BoardMasterRepository boardMasterRepository;

        @Autowired
        private BoardRepository boardRepository;

        @Test
        @DisplayName("게시판 마스터 저장 및 조회")
        void boardMasterTest() {
                // Given
                BoardMaster master = BoardMaster.builder()
                                .bbsId("BBS_001")
                                .bbsNm("공지사항")
                                .bbsTyCode("BBST01")
                                .bbsAttrbCode("BBSA01")
                                .useAt("Y")
                                .frstRegisterId("SYSTEM")
                                .build();

                // When
                boardMasterRepository.save(master);
                Optional<BoardMaster> found = boardMasterRepository.findById("BBS_001");

                // Then
                assertThat(found).isPresent();
                assertThat(found.get().getBbsNm()).isEqualTo("공지사항");
        }

        @Test
        @DisplayName("게시물 저장 및 조회")
        void boardArticleTest() {
                // Given
                Board article = Board.builder()
                                .bbsId("BBS_001")
                                .nttSj("테스트 제목")
                                .nttCn("테스트 내용")
                                .ntceBgnde("20240101")
                                .ntceEndde("20991231")
                                .build();

                // When
                Board saved = boardRepository.save(article);
                Optional<Board> found = boardRepository.findById(saved.getNttId());

                // Then
                assertThat(found).isPresent();
                assertThat(found.get().getNttSj()).isEqualTo("테스트 제목");
        }
}
