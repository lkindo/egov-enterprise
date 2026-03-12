package com.company.project.domain.board;

import com.company.project.config.TestQueryDslConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestQueryDslConfig.class)
@ActiveProfiles("test")
@DisplayName("BoardMasterRepository 테스트")
class BoardMasterRepositoryTest {

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    @Test
    @DisplayName("BoardMaster 저장 및 조회 테스트")
    void saveAndFindTest() {
        // Given
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_TEST_001")
                .bbsNm("Test Board")
                .bbsTyCode("COM004")
                .bbsAttrbCode("COM009")
                .useAt("Y")
                .build();

        // When
        boardMasterRepository.save(master);
        Optional<BoardMaster> found = boardMasterRepository.findById("BBS_TEST_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getBbsNm()).isEqualTo("Test Board");
    }

    @Test
    @DisplayName("BoardMaster 검색 테스트 (QueryDSL)")
    void searchTest() {
        // Given
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_TEST_002")
                .bbsNm("Searchable Board")
                .bbsTyCode("COM004")
                .bbsAttrbCode("COM009")
                .useAt("Y")
                .build();
        boardMasterRepository.save(master);

        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchWrd("Searchable");
        condition.setSearchCnd("0"); // bbsNm

        // When
        Page<BoardMasterSearchResult> results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).isNotEmpty();
        assertThat(results.getContent().get(0).getBbsNm()).contains("Searchable");
    }
}
