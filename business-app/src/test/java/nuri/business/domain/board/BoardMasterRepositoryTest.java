package nuri.business.domain.board;

import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeRepository;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
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
    @DisplayName("검색어는 게시판명에만 걸리고 검색 조건 없이도 적용된다 — 유형 이름 축(COM004)은 없다")
    void searchTest() {
        // Given — 공통코드 COM004 가 있는 환경을 흉내 낸다. 목록은 그 이름을 읽지도 검색하지도 않는다(DEC-OPS-332).
        BoardMaster master = BoardMaster.builder()
                .bbsId("BBS_TEST_002")
                .bbsTtl("Searchable Board")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA01")
                .useYn("Y")
                .build();
        BoardMaster other = BoardMaster.builder()
                .bbsId("BBS_TEST_003")
                .bbsTtl("Other Board")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA01")
                .useYn("Y")
                .build();
        boardMasterRepository.saveAll(List.of(master, other));

        CommonCode code = CommonCode.builder()
                .dtlCd("BBST01")
                .cdId("COM004")
                .dtlCdNm("General Board")
                .useYn("Y")
                .build();
        commonCodeRepository.save(code);

        em.flush();
        em.clear();

        // 1. 화면은 검색 조건 없이 검색어만 보낸다 — 종전에는 이 경우 검색어가 무시돼 두 행이 모두 나왔다.
        BoardMasterSearchCondition condition = new BoardMasterSearchCondition();
        condition.setSearchWrd("Searchable");
        Page<BoardMasterSearchResult> results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).extracting(BoardMasterSearchResult::getBbsId).containsExactly("BBS_TEST_002");
        assertThat(results.getTotalElements()).isEqualTo(1);
        assertThat(results.getContent().get(0).getBbsTypeCd()).isEqualTo("BBST01");

        // 2. 유형 이름으로는 찾지 않는다 — COM004 의 이름은 목록이 읽지 않는다.
        condition.setSearchWrd("General");
        results = boardMasterRepository.searchBoardMasters(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).isEmpty();
        assertThat(results.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("게시판 마스터 목록은 공통코드 COM004 를 조인하지 않는다(GAP-BOARD-002)")
    void searchDoesNotReadTheBoardTypeCodeGroup() throws IOException {
        String source = Files.readString(
                Path.of("src", "main", "java", "nuri", "business", "domain", "board",
                        "BoardMasterRepositoryImpl.java"),
                StandardCharsets.UTF_8);

        // 주석은 COM004 를 언급할 수 있다 — 코드의 문자열 리터럴만 본다.
        assertThat(source).doesNotContain("\"COM004\"");
        // 속성 그룹(COM009)은 그대로 이름을 붙인다.
        assertThat(source).contains("\"COM009\"");
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
