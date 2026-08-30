package nuri.business.domain.board;

import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeRepository;
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
import java.util.List;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
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
                .bbsTtl("Test Board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("Y")
                .build();

        // When
        boardMasterRepository.save(master);
        em.flush();
        em.clear();
        Optional<BoardMaster> found = boardMasterRepository.findById("BBS_TEST_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getBbsTtl()).isEqualTo("Test Board");
    }

    @Test
    @DisplayName("일괄 영구삭제 조회는 옵션까지 한 번에 적재해 cascade 삭제를 보존한다")
    void findAllWithOptionByBbsIdIn_supportsSafeBatchDelete() {
        BoardMaster first = BoardMaster.builder()
                .bbsId("BBS_BATCH_001")
                .bbsTtl("Batch Board 1")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("N")
                .build();
        first.registerOption("N", "N");
        BoardMaster second = BoardMaster.builder()
                .bbsId("BBS_BATCH_002")
                .bbsTtl("Batch Board 2")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("N")
                .build();
        second.registerOption("N", "N");
        // assigned String @Id + @MapsId 옵션은 saveAll→merge 시 신규 옵션을 detached로 오판한다.
        // 프로덕션 BoardMasterService#createBoardMaster와 같은 persist 생명주기로 fixture를 만든다.
        em.persist(first);
        em.persist(second);
        em.flush();
        em.clear();

        List<BoardMaster> targets = boardMasterRepository.findAllWithOptionByBbsIdIn(
                List.of("BBS_BATCH_001", "BBS_BATCH_002"));

        assertThat(targets).extracting(BoardMaster::getBbsId)
                .containsExactlyInAnyOrder("BBS_BATCH_001", "BBS_BATCH_002");
        assertThat(targets).allSatisfy(master -> {
            assertThat(master.getOption()).isNotNull();
            assertThat(org.hibernate.Hibernate.isInitialized(master.getOption())).isTrue();
        });

        boardMasterRepository.deleteAll(targets);
        em.flush();
        em.clear();
        assertThat(em.find(BoardMaster.class, "BBS_BATCH_001")).isNull();
        assertThat(em.find(BoardMasterOption.class, "BBS_BATCH_001")).isNull();
        assertThat(em.find(BoardMaster.class, "BBS_BATCH_002")).isNull();
        assertThat(em.find(BoardMasterOption.class, "BBS_BATCH_002")).isNull();
    }

    @Test
    @DisplayName("BoardMaster 검색 테스트 (QueryDSL)")
    void searchTest() {
        // Given
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_TEST_002")
                .bbsTtl("Searchable Board")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA01")
                .useYn("Y")
                .build();
        boardMasterRepository.save(master);

        CommonCode code = CommonCode.builder()
                .dtlCd("BBST01")
                .cdId("COM004")
                .dtlCdNm("General Board")
                .useYn("Y")
                .build();
        commonCodeRepository.save(code);
        
        em.flush();
        em.clear();

        // 1. Name search
        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchWrd("Searchable");
        condition.setSearchCnd("0"); // bbsTtl
        Page<BoardMasterSearchResult> results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).isNotEmpty();
        assertThat(results.getContent().get(0).getBbsTtl()).contains("Searchable");

        // 2. Type search
        condition.setSearchWrd("General");
        condition.setSearchCnd("1"); // bbsTypeCdNm
        results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).isNotEmpty();
        assertThat(results.getContent().get(0).getBbsTypeCdNm()).isEqualTo("General Board");
    }

    @Test
    @DisplayName("생성시각이 같아도 두 페이지를 게시판 ID 순서로 중복·누락 없이 잇는다")
    void searchUsesBoardIdAsStableTieBreaker() {
        boardMasterRepository.saveAll(List.of(
                pagingBoard("BBS_PAGE_C"),
                pagingBoard("BBS_PAGE_A"),
                pagingBoard("BBS_PAGE_B")));
        em.flush();
        em.createNativeQuery("""
                update tb_bbs_master
                   set crt_dt = :createdAt
                 where bbs_id like 'BBS_PAGE_%'
                """)
                .setParameter("createdAt", LocalDateTime.of(2026, 8, 30, 0, 0))
                .executeUpdate();
        em.clear();

        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchCnd("0");
        condition.setSearchWrd("Paging board");

        Page<BoardMasterSearchResult> first = boardMasterRepository.searchBoardMasters(
                condition, PageRequest.of(0, 2));
        Page<BoardMasterSearchResult> second = boardMasterRepository.searchBoardMasters(
                condition, PageRequest.of(1, 2));

        assertThat(first.getTotalElements()).isEqualTo(3);
        assertThat(second.getTotalElements()).isEqualTo(3);
        assertThat(List.of(first, second).stream()
                .flatMap(Page::stream)
                .map(BoardMasterSearchResult::getBbsId))
                .containsExactly("BBS_PAGE_A", "BBS_PAGE_B", "BBS_PAGE_C");
    }

    @Test
    @DisplayName("생성시각 뒤에는 게시판 PK tie-breaker가 선언된다")
    void searchDeclaresStablePagingOrder() throws IOException {
        String source = Files.readString(
                Path.of("src", "main", "java", "nuri", "business", "domain", "board",
                        "BoardMasterRepositoryImpl.java"),
                StandardCharsets.UTF_8);

        assertThat(source).contains(
                ".orderBy(boardMaster.crtDt.desc(), boardMaster.bbsId.asc())");
    }

    @Test
    @DisplayName("BoardMaster 상세 조회 테스트 (Custom)")
    void findBoardMasterDetailTest() {
        // Given
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_DETAIL_001")
                .bbsTtl("Detail Board")
                .bbsTypeCd("T1")
                .bbsAtrbCd("A1")
                .useYn("Y")
                .build();
        boardMasterRepository.save(master);

        BoardUse use = BoardUse.builder()
                .bbsId("BBS_DETAIL_001")
                .trgtId("USER_001")
                .useYn("Y")
                .build();
        boardUseRepository.save(use);
        
        em.flush();
        em.clear();

        // When
        Optional<BoardMasterDetailResult> result = boardMasterRepository.findBoardMasterDetail("BBS_DETAIL_001", "USER_001");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getBbsTtl()).isEqualTo("Detail Board");
        assertThat(result.get().getAuthFlag()).isEqualTo("Y");
    }

    @Test
    @DisplayName("미사용 보드 검색 테스트 (notUsedOnly)")
    void searchNotUsedTest() {
        // Given
        BoardMaster masterUsed = BoardMaster.builder().bbsId("BBS_USED").bbsTtl("Used").bbsTypeCd("T1").bbsAtrbCd("A1").useYn("Y").build();
        BoardMaster masterNotUsed = BoardMaster.builder().bbsId("BBS_NOT_USED").bbsTtl("Not Used").bbsTypeCd("T1").bbsAtrbCd("A1").useYn("Y").build();
        boardMasterRepository.save(masterUsed);
        boardMasterRepository.save(masterNotUsed);

        BoardUse use = BoardUse.builder().bbsId("BBS_USED").trgtId("SYSTEM").useYn("Y").build();
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

    private static BoardMaster pagingBoard(String bbsId) {
        return BoardMaster.builder()
                .bbsId(bbsId)
                .bbsTtl("Paging board " + bbsId)
                .bbsTypeCd("PAGING_TYPE")
                .bbsAtrbCd("PAGING_ATTR")
                .useYn("Y")
                .build();
    }
}
