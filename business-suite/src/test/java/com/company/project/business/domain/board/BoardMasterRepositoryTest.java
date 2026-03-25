package com.company.project.business.domain.board;

import com.company.project.foundation.domain.code.CommonCode;
import com.company.project.foundation.domain.code.CommonCodeRepository;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

import com.company.project.foundation.domain.config.JpaConfig;
import com.company.project.foundation.security.audit.LoginUserAuditorAware;
import org.springframework.context.annotation.Import;

@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("BoardMasterRepository 테스트")
class BoardMasterRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    @Autowired
    private CommonCodeRepository commonCodeRepository;

    @Autowired
    private BoardUseRepository boardUseRepository;

    @Autowired
    private EntityManager em;

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
        em.flush();
        em.clear();
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
                .bbsTyCode("BBST01")
                .bbsAttrbCode("BBSA01")
                .useAt("Y")
                .build();
        boardMasterRepository.save(master);

        CommonCode code = CommonCode.builder()
                .code("BBST01")
                .codeGroupId("COM004")
                .codeNm("General Board")
                .useAt("Y")
                .build();
        commonCodeRepository.save(code);
        
        em.flush();
        em.clear();

        // 1. Name search
        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchWrd("Searchable");
        condition.setSearchCnd("0"); // bbsNm
        Page<BoardMasterSearchResult> results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).isNotEmpty();
        assertThat(results.getContent().get(0).getBbsNm()).contains("Searchable");

        // 2. Type search
        condition.setSearchWrd("General");
        condition.setSearchCnd("1"); // bbsTyCodeNm
        results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).isNotEmpty();
        assertThat(results.getContent().get(0).getBbsTyCodeNm()).isEqualTo("General Board");
    }

    @Test
    @DisplayName("BoardMaster 상세 조회 테스트 (Custom)")
    void findBoardMasterDetailTest() {
        // Given
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_DETAIL_001")
                .bbsNm("Detail Board")
                .bbsTyCode("T1")
                .bbsAttrbCode("A1")
                .useAt("Y")
                .build();
        boardMasterRepository.save(master);

        BoardUse use = BoardUse.builder()
                .bbsId("BBS_DETAIL_001")
                .trgetId("USER_001")
                .useAt("Y")
                .build();
        boardUseRepository.save(use);
        
        em.flush();
        em.clear();

        // When
        Optional<BoardMasterDetailResult> result = boardMasterRepository.findBoardMasterDetail("BBS_DETAIL_001", "USER_001");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getBbsNm()).isEqualTo("Detail Board");
        assertThat(result.get().getAuthFlag()).isEqualTo("Y");
    }

    @Test
    @DisplayName("미사용 보드 검색 테스트 (notUsedOnly)")
    void searchNotUsedTest() {
        // Given
        BoardMaster masterUsed = BoardMaster.builder().bbsId("BBS_USED").bbsNm("Used").bbsTyCode("T1").bbsAttrbCode("A1").useAt("Y").build();
        BoardMaster masterNotUsed = BoardMaster.builder().bbsId("BBS_NOT_USED").bbsNm("Not Used").bbsTyCode("T1").bbsAttrbCode("A1").useAt("Y").build();
        boardMasterRepository.save(masterUsed);
        boardMasterRepository.save(masterNotUsed);

        BoardUse use = BoardUse.builder().bbsId("BBS_USED").trgetId("SYSTEM").useAt("Y").build();
        boardUseRepository.save(use);
        
        em.flush();
        em.clear();

        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setNotUsedOnly(true);

        // When
        Page<BoardMasterSearchResult> results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getBbsId()).isEqualTo("BBS_NOT_USED");
    }
}
