package nuri.business.domain.board;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.ActiveProfiles;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("BoardRepository 테스트")
class BoardRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    @Autowired
    private EntityManager em;

    private BoardMaster testMaster;

    @BeforeEach
    void setUp() {
        testMaster = BoardMaster.builder()
                .bbsId("BBS_TEST_999")
                .bbsTtl("Integrated Test Board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("Y")
                .build();
        boardMasterRepository.save(testMaster);
    }

    @Test
    @DisplayName("게시글 상세 조회 테스트 (Custom)")
    void findArticleDetailTest() {
        // Given
        Board article = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Detail Test Subject")
                .pstCn("Detail Test Content")
                .useYn("Y")
                .userId("USR_001")
                .userNm("Tester")
                .build();
        Board saved = boardRepository.save(article);
        em.flush();
        em.clear();

        // When
        Optional<BoardDetailResult> result = boardRepository.findActiveArticleDetail(
                testMaster.getBbsId(), saved.getPstSn());

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getPstTtl()).isEqualTo("Detail Test Subject");
        assertThat(result.get().getBbsTtl()).isEqualTo("Integrated Test Board");
    }

    @Test
    @DisplayName("목록·상세가 저장된 댓글 수를 실제로 실어 준다 — 화면의 '댓글 N' 이 언제나 0 이던 축")
    void searchAndDetailCarryCommentCount() {
        /*
         * [2026-08-29] tb_bbs.cmnt_cnt 는 BoardEventListener 가 실제로 유지한다
         * (commentRepository.countByBbsIdAndPstSnAndUseYn → syncCmntCntAtomic 벌크 UPDATE).
         * 그런데 BoardRepositoryImpl 의 목록·상세 projection 이 **둘 다** 이 필드를 빼고 있어,
         * BoardSearchResult/BoardDetailResult 의 commentCnt 가 언제나 null 이었다. 화면은
         * 그것을 0 으로 렌더했다 — 값이 없는 게 아니라 안 가져온 것이라 사용자는 댓글이 달린
         * 글도 '댓글 0' 으로 봤다.
         *
         * 소스 문자열이 아니라 쿼리 결과로 고정한다. projection 에서 필드를 빼면 여기서 red 다.
         */
        Board article = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Comment count carrier")
                .pstCn("body")
                .useYn("Y")
                .userId("USR_CC")
                .userNm("Tester")
                .build());
        em.flush();

        // 실제 운영 경로와 같은 방식으로 값을 넣는다 — 리스너가 부르는 그 벌크 UPDATE 다.
        boardRepository.syncCmntCntAtomic(article.getPstSn(), 3);
        em.clear();

        Optional<BoardDetailResult> detail = boardRepository.findActiveArticleDetail(
                testMaster.getBbsId(), article.getPstSn());
        assertThat(detail).isPresent();
        assertThat(detail.get().getCommentCnt())
                .as("상세 projection 이 cmnt_cnt 를 빠뜨리면 화면의 댓글 수가 0 이 된다")
                .isEqualTo(3);

        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());
        Page<BoardSearchResult> page = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(page.getContent()).isNotEmpty();
        assertThat(page.getContent())
                .filteredOn(r -> r.getPstSn().equals(article.getPstSn()))
                .singleElement()
                .extracting(BoardSearchResult::getCommentCnt)
                .as("목록 projection 이 cmnt_cnt 를 빠뜨리면 목록의 댓글 수가 0 이 된다")
                .isEqualTo(3);
    }

    @Test
    @DisplayName("상세 조회는 게시판 ID와 활성 상태를 SQL 경계에서 함께 결속한다")
    void findActiveArticleDetailBindsBoardAndUseYn() {
        Board active = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Active detail")
                .pstCn("active-body-marker")
                .useYn("Y")
                .scrtYn("N")
                .build());
        Board inactive = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Inactive detail")
                .pstCn("inactive-body-marker")
                .useYn("N")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        assertThat(boardRepository.findActiveArticleDetail(testMaster.getBbsId(), active.getPstSn()))
                .get()
                .extracting(BoardDetailResult::getPstCn)
                .isEqualTo("active-body-marker");
        assertThat(boardRepository.findActiveArticleDetail("BBS_WRONG", active.getPstSn()))
                .isEmpty();
        assertThat(boardRepository.findActiveArticleDetail(testMaster.getBbsId(), inactive.getPstSn()))
                .isEmpty();
    }

    @Test
    @DisplayName("상세 조회는 비활성 게시판 master의 활성 글도 반환하지 않는다")
    void findActiveArticleDetailRequiresActiveBoardMaster() {
        BoardMaster inactiveMaster = boardMasterRepository.save(BoardMaster.builder()
                .bbsId("BBS_INACTIVE_MASTER")
                .bbsTtl("Inactive board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("N")
                .build());
        Board article = boardRepository.save(Board.builder()
                .bbsId(inactiveMaster.getBbsId())
                .pstTtl("Hidden with board")
                .pstCn("inactive-board-body-marker")
                .useYn("Y")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        assertThat(boardRepository.findActiveArticleDetail(inactiveMaster.getBbsId(), article.getPstSn()))
                .isEmpty();
        assertThat(boardRepository.findPublicArticleDetail(inactiveMaster.getBbsId(), article.getPstSn()))
                .isEmpty();
    }

    @Test
    @DisplayName("공개 FAQ 상세 projection은 비밀글과 비활성 글의 본문을 반환하지 않는다")
    void findPublicArticleDetailExcludesSecretAndInactivePosts() {
        Board publicArticle = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Public FAQ")
                .pstCn("public-body-marker")
                .userId("owner-sensitive-id")
                .userNm("owner-sensitive-name")
                .pswd("stored-secret-marker")
                .atchFileSn(91L)
                .qnaSttsCd("SENSITIVE")
                .useYn("Y")
                .scrtYn("N")
                .build());
        Board secretArticle = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Secret FAQ")
                .pstCn("secret-body-marker")
                .useYn("Y")
                .scrtYn("Y")
                .build());
        Board inactiveArticle = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Inactive FAQ")
                .pstCn("inactive-body-marker")
                .useYn("N")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        BoardDetailResult publicDetail = boardRepository
                .findPublicArticleDetail(testMaster.getBbsId(), publicArticle.getPstSn())
                .orElseThrow();
        assertThat(publicDetail.getPstCn()).isEqualTo("public-body-marker");
        assertThat(publicDetail.getUserId()).isNull();
        assertThat(publicDetail.getUserNm()).isNull();
        assertThat(publicDetail.getPswd()).isNull();
        assertThat(publicDetail.getAtchFileSn()).isNull();
        assertThat(publicDetail.getQnaSttsCd()).isNull();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), secretArticle.getPstSn()))
                .isEmpty();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), inactiveArticle.getPstSn()))
                .isEmpty();
        assertThat(boardRepository.findPublicArticleDetail("BBS_WRONG", publicArticle.getPstSn()))
                .isEmpty();
    }

    @Test
    @DisplayName("게시글 검색 테스트 (QueryDSL)")
    void searchArticlesTest() {
        // Given
        Board article1 = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Search Target 1")
                .pstCn("Content 1")
                .userNm("User1")
                .useYn("Y")
                .build();
        Board article2 = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Other Topic")
                .pstCn("Special Content")
                .userNm("Manager")
                .useYn("Y")
                .build();
        boardRepository.save(article1);
        boardRepository.save(article2);
        em.flush();
        em.clear();

        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());

        // 1. Title search (0)
        condition.setSearchWrd("Search");
        condition.setSearchCnd("0");
        Page<BoardSearchResult> results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getPstTtl()).contains("Search Target 1");

        // 2. Content search (1)
        condition.setSearchWrd("Special");
        condition.setSearchCnd("1");
        results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getPstTtl()).isEqualTo("Other Topic");

        // 3. Writer search (2)
        condition.setSearchWrd("Manager");
        condition.setSearchCnd("2");
        results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getUserNm()).isEqualTo("Manager");
    }

    @Test
    @DisplayName("공개 FAQ 전용 목록은 활성 공개 제목만 검색해 비밀 제목과 본문 membership을 숨긴다")
    void searchPublicFaqArticlesBindsVisibilityAndTitleOnlySearch() {
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("membership-marker public FAQ")
                .pstCn("public body")
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("membership-marker secret FAQ")
                .pstCn("secret body")
                .useYn("Y")
                .scrtYn("Y")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Content-only match")
                .pstCn("membership-marker in body")
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("membership-marker inactive FAQ")
                .pstCn("inactive body")
                .useYn("N")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        Page<BoardSearchResult> results = boardRepository.searchPublicFaqArticles(
                testMaster.getBbsId(), "membership-marker", PageRequest.of(0, 10));

        assertThat(results.getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactly("membership-marker public FAQ");
        assertThat(results.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("범용 목록은 SQL에서 공개글과 exact owner/admin 비밀글만 반환하고 검색 membership·count oracle을 닫는다")
    void searchArticlesAppliesSecretVisibilityBeforeSearchAndCount() {
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Public article")
                .pstCn("public-body")
                .userId("ESNTL_PUBLIC_OWNER")
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Secret title oracle marker")
                .pstCn("secret-content-oracle-marker")
                .userId("ESNTL_SECRET_OWNER")
                .useYn("Y")
                .scrtYn("Y")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Inactive public article")
                .pstCn("inactive-body")
                .userId("ESNTL_PUBLIC_OWNER")
                .useYn("N")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        BoardSearchCondition nonOwner = visibleCondition("ESNTL_OTHER", false);
        Page<BoardSearchResult> nonOwnerResults = boardRepository.searchArticles(
                nonOwner, PageRequest.of(0, 10));
        assertThat(nonOwnerResults.getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactly("Public article");
        assertThat(nonOwnerResults.getTotalElements()).isEqualTo(1);

        nonOwner.setSearchCnd("0");
        nonOwner.setSearchWrd("Secret title oracle marker");
        Page<BoardSearchResult> titleOracle = boardRepository.searchArticles(
                nonOwner, PageRequest.of(0, 10));
        assertThat(titleOracle.getContent()).isEmpty();
        assertThat(titleOracle.getTotalElements()).isZero();

        nonOwner.setSearchCnd("1");
        nonOwner.setSearchWrd("secret-content-oracle-marker");
        Page<BoardSearchResult> contentOracle = boardRepository.searchArticles(
                nonOwner, PageRequest.of(0, 10));
        assertThat(contentOracle.getContent()).isEmpty();
        assertThat(contentOracle.getTotalElements()).isZero();

        BoardSearchCondition owner = visibleCondition("ESNTL_SECRET_OWNER", false);
        owner.setSearchCnd("1");
        owner.setSearchWrd("secret-content-oracle-marker");
        assertThat(boardRepository.searchArticles(owner, PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactly("Secret title oracle marker");

        BoardSearchCondition admin = visibleCondition(null, true);
        admin.setSearchCnd("0");
        admin.setSearchWrd("Secret title oracle marker");
        assertThat(boardRepository.searchArticles(admin, PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactly("Secret title oracle marker");
    }

    private BoardSearchCondition visibleCondition(String viewerEsntlId, boolean secretPostAdminOverride) {
        BoardSearchCondition condition = new BoardSearchCondition(testMaster.getBbsId());
        condition.setUseYn("Y");
        condition.setViewerEsntlId(viewerEsntlId);
        condition.setSecretPostAdminOverride(secretPostAdminOverride);
        return condition;
    }

    @Test
    @DisplayName("범용 목록은 비활성 게시판 master의 글을 content와 count 모두에서 제외한다")
    void searchArticlesRequiresActiveBoardMaster() {
        BoardMaster inactiveMaster = boardMasterRepository.save(BoardMaster.builder()
                .bbsId("BBS_LIST_INACTIVE")
                .bbsTtl("Inactive list board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(inactiveMaster.getBbsId())
                .pstTtl("Inactive master article")
                .userId("ESNTL_OWNER")
                .useYn("Y")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        BoardSearchCondition condition = new BoardSearchCondition(inactiveMaster.getBbsId());
        condition.setUseYn("Y");
        condition.setViewerEsntlId("ESNTL_OWNER");
        Page<BoardSearchResult> result = boardRepository.searchArticles(
                condition, PageRequest.of(0, 10));

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("통계 집계는 활성 master와 viewer visibility를 count·view sum·top contributor에 동일 적용한다")
    void aggregateVisibleBoardStatsClosesSecretExistenceAndContributorOracle() {
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Public aggregate row")
                .userId("ESNTL_PUBLIC_OWNER")
                .userNm("Public contributor")
                .inqCnt(5)
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Secret aggregate row one")
                .userId("ESNTL_SECRET_OWNER")
                .userNm("Secret contributor")
                .inqCnt(100)
                .useYn("Y")
                .scrtYn("Y")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Secret aggregate row two")
                .userId("ESNTL_SECRET_OWNER")
                .userNm("Secret contributor")
                .inqCnt(200)
                .useYn("Y")
                .scrtYn("Y")
                .build());
        em.flush();
        em.clear();

        BoardStatsResult nonOwner = boardRepository.aggregateVisibleStats(
                visibleCondition("ESNTL_OTHER", false));
        assertThat(nonOwner.totalArticles()).isEqualTo(1);
        assertThat(nonOwner.totalViews()).isEqualTo(5);
        assertThat(nonOwner.topContributor()).isEqualTo("Public contributor");

        BoardStatsResult owner = boardRepository.aggregateVisibleStats(
                visibleCondition("ESNTL_SECRET_OWNER", false));
        assertThat(owner.totalArticles()).isEqualTo(3);
        assertThat(owner.totalViews()).isEqualTo(305);
        assertThat(owner.topContributor()).isEqualTo("Secret contributor");

        BoardStatsResult admin = boardRepository.aggregateVisibleStats(
                visibleCondition(null, true));
        assertThat(admin.totalArticles()).isEqualTo(3);
        assertThat(admin.totalViews()).isEqualTo(305);
        assertThat(admin.topContributor()).isEqualTo("Secret contributor");
    }

    @Test
    @DisplayName("통계 집계는 비활성 게시판 master의 공개글도 0으로 닫는다")
    void aggregateVisibleBoardStatsRequiresActiveBoardMaster() {
        BoardMaster inactiveMaster = boardMasterRepository.save(BoardMaster.builder()
                .bbsId("BBS_STATS_INACTIVE")
                .bbsTtl("Inactive stats board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(inactiveMaster.getBbsId())
                .pstTtl("Inactive aggregate row")
                .userId("ESNTL_OWNER")
                .userNm("Inactive contributor")
                .inqCnt(999)
                .useYn("Y")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        BoardSearchCondition condition = new BoardSearchCondition(inactiveMaster.getBbsId());
        condition.setUseYn("Y");
        condition.setViewerEsntlId("ESNTL_OWNER");
        BoardStatsResult result = boardRepository.aggregateVisibleStats(condition);

        assertThat(result.totalArticles()).isZero();
        assertThat(result.totalViews()).isZero();
        assertThat(result.topContributor()).isNull();
    }

    @Test
    @DisplayName("공개글 최다 기여자 group이 null이면 기존 System 매핑용 null을 보존한다")
    void aggregateVisibleBoardStatsPreservesPublicNullContributorMajority() {
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Anonymous public one")
                .userNm(null)
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Anonymous public two")
                .userNm(null)
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Named public")
                .userNm("Named contributor")
                .useYn("Y")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        BoardStatsResult result = boardRepository.aggregateVisibleStats(
                visibleCondition("ESNTL_VIEWER", false));

        assertThat(result.topContributor()).isNull();
    }

    @Test
    @DisplayName("공개글 최다 기여자 group이 empty이면 기존 empty 반환을 보존한다")
    void aggregateVisibleBoardStatsPreservesPublicEmptyContributorMajority() {
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Empty contributor public one")
                .userNm("")
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Empty contributor public two")
                .userNm("")
                .useYn("Y")
                .scrtYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Named public")
                .userNm("Named contributor")
                .useYn("Y")
                .scrtYn("N")
                .build());
        em.flush();
        em.clear();

        BoardStatsResult result = boardRepository.aggregateVisibleStats(
                visibleCondition("ESNTL_VIEWER", false));

        assertThat(result.topContributor()).isEmpty();
    }

    @Test
    @DisplayName("정렬 조건 검색 테스트 (views, comments, date)")
    void searchWithOrderTest() throws InterruptedException {
        // Given
        Board articleLow = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Low")
                .inqCnt(10)
                .cmntCnt(1)
                .useYn("Y")
                .build();
        boardRepository.save(articleLow);
        
        Thread.sleep(10);
        
        Board articleHigh = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("High")
                .inqCnt(100)
                .cmntCnt(10)
                .useYn("Y")
                .build();
        boardRepository.save(articleHigh);
        em.flush();
        em.clear();

        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());

        // views desc
        condition.setOrderBy("views");
        Page<BoardSearchResult> results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(results.getContent().get(0).getInqCnt()).isEqualTo(100);

        // date desc
        condition.setOrderBy("date");
        results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(results.getContent().get(0).getPstTtl()).isEqualTo("High"); // saved later
    }

    @Test
    @DisplayName("날짜 기간 검색 테스트")
    void searchWithDateRangeTest() {
        // Given
        Board oldPost = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Old")
                .useYn("Y")
                .build();
        boardRepository.save(oldPost);
        em.flush();
        em.clear();

        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());
        condition.setStartDate(LocalDateTime.now().minusDays(1));
        condition.setEndDate(LocalDateTime.now().plusDays(1));

        // When
        Page<BoardSearchResult> results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("기본 search 및 findByIdCustom 테스트")
    void otherCustomMethodsTest() {
        // Given
        Board article = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Topic")
                .useYn("Y")
                .build();
        Board saved = boardRepository.save(article);
        em.flush();
        em.clear();

        // 1. findByIdCustom
        Optional<Board> found = boardRepository.findByIdCustom(saved.getPstSn());
        assertThat(found).isPresent();
        assertThat(found.get().getPstTtl()).isEqualTo("Topic");

        // 2. search (returning Board entities)
        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());
        Page<Board> results = boardRepository.search(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getPstTtl()).isEqualTo("Topic");
    }
}
