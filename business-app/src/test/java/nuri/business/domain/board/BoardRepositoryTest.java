package nuri.business.domain.board;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
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
import java.util.List;
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

    /** 공개 FAQ 게시 종료 판정에 넘기는 고정 기준일. */
    private static final String TODAY = "20261023";

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
    @DisplayName("일별 게시글 집계는 마지막 마이크로초를 포함하고 다음날 0시·비활성 글은 제외한다")
    void countPostsByDateUsesHalfOpenRange() {
        LocalDateTime start = LocalDateTime.of(2024, 2, 29, 0, 0);
        LocalDateTime end = start.plusDays(1);
        for (LocalDateTime time : List.of(start.minusNanos(1000), start,
                end.minusNanos(1000), end, end.plusNanos(1000))) {
            persistPostAt(time, "Y");
        }
        persistPostAt(end.minusNanos(1000), "N");
        em.clear();

        List<Object[]> rows = boardRepository.countPostsByDate("2024-02-29 00:00:00", "2024-03-01 00:00:00");

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0)[0]).isEqualTo("2024-02-29");
        assertThat(((Number) rows.get(0)[1]).longValue()).isEqualTo(2);
    }

    private void persistPostAt(LocalDateTime time, String useYn) {
        Board row = boardRepository.saveAndFlush(Board.builder().bbsId(testMaster.getBbsId())
                .pstTtl("Boundary post").pstCn("body").useYn(useYn).build());
        em.createNativeQuery("UPDATE tb_bbs_item SET crt_dt = :time WHERE pst_sn = :id")
                .setParameter("time", time).setParameter("id", row.getPstSn()).executeUpdate();
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
    @DisplayName("영구삭제 가드 조회는 숨김 게시글도 포함해 게시판 ID를 한 번에 반환한다")
    void findBbsIdsHavingAnyArticles_includesSoftDeletedRows() {
        BoardMaster emptyMaster = boardMasterRepository.save(BoardMaster.builder()
                .bbsId("BBS_EMPTY")
                .bbsTtl("Empty Board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("N")
                .build());
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Hidden article")
                .pstCn("Hidden body")
                .useYn("N")
                .userId("USR_001")
                .userNm("Tester")
                .build());
        em.flush();
        em.clear();

        List<String> result = boardRepository.findBbsIdsHavingAnyArticles(
                List.of(testMaster.getBbsId(), emptyMaster.getBbsId()));

        assertThat(result).containsExactly(testMaster.getBbsId());
    }

    @Test
    @DisplayName("목록·상세가 저장된 댓글 수를 실제로 실어 준다 — 화면의 '댓글 N' 이 언제나 0 이던 축")
    void searchAndDetailCarryCommentCount() {
        /*
         * [2026-08-29] tb_bbs.cmnt_cnt 는 BoardEventListener 가 실제로 유지한다
         * (PostCommentCountChangedEvent delta → adjustCmntCntAtomic 벌크 UPDATE).
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
                .cmntCnt(3)
                .build());
        em.flush();
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
    @DisplayName("댓글 수 delta는 board 행에서 원자 반영되고 0 아래로 내려가지 않는다")
    void adjustCommentCountAppliesDeltaAndClampsAtZero() {
        Board article = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Adjust comments")
                .pstCn("body")
                .useYn("Y")
                .cmntCnt(1)
                .build());
        em.flush();

        assertThat(boardRepository.adjustCmntCntAtomic(testMaster.getBbsId(), article.getPstSn(), 1))
                .isEqualTo(1);
        assertThat(boardRepository.adjustCmntCntAtomic(testMaster.getBbsId(), article.getPstSn(), -1))
                .isEqualTo(1);
        assertThat(boardRepository.adjustCmntCntAtomic(testMaster.getBbsId(), article.getPstSn(), -1))
                .isEqualTo(1);
        assertThat(boardRepository.adjustCmntCntAtomic(testMaster.getBbsId(), article.getPstSn(), -1))
                .isEqualTo(1);
        assertThat(boardRepository.adjustCmntCntAtomic("OTHER_BOARD", article.getPstSn(), 1))
                .isZero();
        em.clear();

        assertThat(boardRepository.findActiveArticleDetail(testMaster.getBbsId(), article.getPstSn()))
                .get()
                .extracting(BoardDetailResult::getCommentCnt)
                .isEqualTo(0);
    }

    @Test
    @DisplayName("논리 삭제된 게시글은 +1을 거부하고 진행 중이던 삭제의 -1은 반영한다")
    void adjustCommentCountRejectsCreateButAllowsDeleteForSoftDeletedPost() {
        Board hidden = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Hidden comments")
                .pstCn("body")
                .useYn("N")
                .cmntCnt(2)
                .build());
        em.flush();

        assertThat(boardRepository.adjustCmntCntAtomic(testMaster.getBbsId(), hidden.getPstSn(), 1))
                .isZero();
        assertThat(boardRepository.adjustCmntCntAtomic(testMaster.getBbsId(), hidden.getPstSn(), -1))
                .isEqualTo(1);
    }

    @Test
    @DisplayName("정렬 '댓글순'(orderBy=comments)이 실제로 댓글 수 내림차순이다")
    void searchArticlesSortsByCommentCount() {
        /*
         * [2026-08-29] 화면의 정렬 선택지 '댓글순' 은 orderBy=comments 로 서버까지 전달되는데
         * switch 에 case 가 없어 default(sortOrdr.desc)로 조용히 떨어졌다. 골라도 목록이 그대로라
         * 사용자는 정렬이 된 줄 알았다 — 아무 일도 하지 않는 선택지였다.
         */
        Board few = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId()).pstTtl("few comments").pstCn("b")
                .useYn("Y").userId("U1").userNm("T").cmntCnt(1).build());
        Board many = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId()).pstTtl("many comments").pstCn("b")
                .useYn("Y").userId("U2").userNm("T").cmntCnt(9).build());
        em.flush();

        // sortOrdr 는 기본 정렬 축이다. '댓글순' 이 무시되면 default 로 떨어져 few 가 앞에 온다.
        em.clear();

        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());
        condition.setOrderBy("comments");

        List<Long> order = boardRepository.searchArticles(condition, PageRequest.of(0, 10))
                .getContent().stream().map(BoardSearchResult::getPstSn).toList();

        assertThat(order)
                .as("'댓글순' 이 switch 에서 누락되면 default 정렬로 떨어져 이 순서가 뒤집힌다")
                .containsSubsequence(many.getPstSn(), few.getPstSn());
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
        assertThat(boardRepository.findPublicArticleDetail(inactiveMaster.getBbsId(), article.getPstSn(), TODAY))
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
                .findPublicArticleDetail(testMaster.getBbsId(), publicArticle.getPstSn(), TODAY)
                .orElseThrow();
        assertThat(publicDetail.getPstCn()).isEqualTo("public-body-marker");
        assertThat(publicDetail.getUserId()).isNull();
        assertThat(publicDetail.getUserNm()).isNull();
        assertThat(publicDetail.getPswd()).isNull();
        assertThat(publicDetail.getAtchFileSn()).isNull();
        assertThat(publicDetail.getQnaSttsCd()).isNull();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), secretArticle.getPstSn(), TODAY))
                .isEmpty();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), inactiveArticle.getPstSn(), TODAY))
                .isEmpty();
        assertThat(boardRepository.findPublicArticleDetail("BBS_WRONG", publicArticle.getPstSn(), TODAY))
                .isEmpty();
    }

    @Test
    @DisplayName("🚨 행사일 기준 기간은 행사일(없으면 작성일)로 거른다 — 지난달 등록한 이달 행사가 달력에 남는다 (DIP V6)")
    void searchArticlesFiltersByEventDateWhenRequested() {
        LocalDateTime septemberFirst = LocalDateTime.of(2026, 9, 1, 0, 0);
        Board registeredEarly = boardRepository.saveAndFlush(Board.builder().bbsId(testMaster.getBbsId())
                .pstTtl("9월 행사, 8월 등록").pstCn("body").useYn("Y")
                .evntDt(LocalDateTime.of(2026, 9, 15, 10, 0)).build());
        Board eventElsewhere = boardRepository.saveAndFlush(Board.builder().bbsId(testMaster.getBbsId())
                .pstTtl("10월 행사, 9월 등록").pstCn("body").useYn("Y")
                .evntDt(LocalDateTime.of(2026, 10, 3, 10, 0)).build());
        Board noEvent = boardRepository.saveAndFlush(Board.builder().bbsId(testMaster.getBbsId())
                .pstTtl("행사일 없음, 9월 등록").pstCn("body").useYn("Y").build());
        setCreatedAt(registeredEarly, LocalDateTime.of(2026, 8, 20, 9, 0));
        setCreatedAt(eventElsewhere, LocalDateTime.of(2026, 9, 10, 9, 0));
        setCreatedAt(noEvent, LocalDateTime.of(2026, 9, 12, 9, 0));
        em.clear();

        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());
        condition.setStartDate(septemberFirst);
        condition.setEndDate(LocalDateTime.of(2026, 9, 30, 23, 59, 59));

        condition.setEventDateBasis(true);
        assertThat(boardRepository.searchArticles(condition, PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactlyInAnyOrder("9월 행사, 8월 등록", "행사일 없음, 9월 등록");

        // 대조군: 기본(작성일) 기준은 종전 그대로다.
        condition.setEventDateBasis(false);
        assertThat(boardRepository.searchArticles(condition, PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactlyInAnyOrder("10월 행사, 9월 등록", "행사일 없음, 9월 등록");
    }

    private void setCreatedAt(Board row, LocalDateTime time) {
        em.createNativeQuery("UPDATE tb_bbs_item SET crt_dt = :time WHERE pst_sn = :id")
                .setParameter("time", time).setParameter("id", row.getPstSn()).executeUpdate();
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
                testMaster.getBbsId(), "membership-marker", TODAY, PageRequest.of(0, 10));

        assertThat(results.getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactly("membership-marker public FAQ");
        assertThat(results.getTotalElements()).isEqualTo(1);
    }

    /**
     * [2026-10-23 ADR-0040 A0] 공개 FAQ 는 일반 목록과 같은 게시 종료 술어를 쓴다. 종료일이 기준일 전이면 목록·상세 모두
     * 빠지고, 기준일 당일·빈 값은 남는다. 비밀 여부가 비어 있는 글은 목록 판정과 같이 공개 글이다.
     */
    @Test
    @DisplayName("공개 FAQ 목록·상세는 게시 종료 글을 빼고 종료일 당일·빈 값·비밀 여부 빈 글은 남긴다")
    void publicFaqAppliesPostingEndDateLikeTheArticleList() {
        Board ended = saveFaq("posting-marker ended", "N", "20261022");
        Board endsToday = saveFaq("posting-marker ends today", "N", TODAY);
        Board blankEnd = saveFaq("posting-marker blank end", "N", "");
        Board noSecretFlag = saveFaq("posting-marker no secret flag", null, null);
        em.flush();
        em.clear();

        Page<BoardSearchResult> results = boardRepository.searchPublicFaqArticles(
                testMaster.getBbsId(), "posting-marker", TODAY, PageRequest.of(0, 10));

        assertThat(results.getContent())
                .extracting(BoardSearchResult::getPstTtl)
                .containsExactlyInAnyOrder("posting-marker ends today", "posting-marker blank end",
                        "posting-marker no secret flag");
        assertThat(results.getTotalElements()).isEqualTo(3);
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), ended.getPstSn(), TODAY)).isEmpty();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), endsToday.getPstSn(), TODAY)).isPresent();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), blankEnd.getPstSn(), TODAY)).isPresent();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), noSecretFlag.getPstSn(), TODAY)).isPresent();
    }

    /**
     * [2026-10-29] 비밀 여부가 비어 있는(NULL) 글은 남의 목록·공개 FAQ 목록·상세에 지금처럼 남고(열람 범위 그대로), 조회 결과의
     * scrtYn 은 'N' 으로 읽힌다. 저장된 값은 NULL 그대로다 — 표현만 열람 판정의 의미에 맞춘다.
     */
    @Test
    @DisplayName("비밀 여부가 NULL 인 글은 남의 목록·공개 FAQ 에 그대로 남고 조회 결과의 scrtYn 은 N 이며 저장값은 NULL 그대로다")
    void nullSecretFlagStaysPublicAndProjectsAsN() {
        Board legacy = boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("null-secret-marker")
                .pstCn("body")
                .userId("ESNTL_LEGACY_OWNER")
                .useYn("Y")
                .build());
        em.flush();
        em.clear();

        Page<BoardSearchResult> others = boardRepository.searchArticles(
                visibleCondition("ESNTL_OTHER", false), PageRequest.of(0, 10));
        assertThat(others.getContent()).extracting(BoardSearchResult::getPstTtl).containsExactly("null-secret-marker");
        assertThat(others.getContent()).extracting(BoardSearchResult::getScrtYn).containsExactly("N");
        assertThat(boardRepository.searchPublicFaqArticles(testMaster.getBbsId(), "null-secret-marker", TODAY,
                        PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getScrtYn).containsExactly("N");
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), legacy.getPstSn(), TODAY)
                .orElseThrow().getScrtYn()).isEqualTo("N");
        assertThat(boardRepository.findActiveArticleDetail(testMaster.getBbsId(), legacy.getPstSn())
                .orElseThrow().getScrtYn()).isEqualTo("N");

        Object stored = em.createNativeQuery("SELECT scrt_yn FROM tb_bbs_item WHERE pst_sn = :id")
                .setParameter("id", legacy.getPstSn())
                .getSingleResult();
        assertThat(stored).as("읽기는 저장값을 바꾸지 않는다").isNull();
    }

    /** [2026-10-23 ADR-0040 A0] 목록 projection 이 게시 기간을 싣지 않아 목록의 '게시 종료' 배지가 그려질 수 없었다. */
    @Test
    @DisplayName("목록 projection 은 게시 시작일·종료일을 싣는다")
    void searchArticlesCarriesPostingPeriod() {
        boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("period-marker")
                .pstCn("body")
                .useYn("Y")
                .scrtYn("N")
                .pstBgngYmd("20261001")
                .pstEndYmd("20261231")
                .build());
        em.flush();
        em.clear();
        BoardSearchCondition condition = new BoardSearchCondition(testMaster.getBbsId());
        condition.setSecretPostAdminOverride(true);

        Page<BoardSearchResult> results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));

        assertThat(results.getContent()).singleElement().satisfies(row -> {
            assertThat(row.getPstBgngYmd()).isEqualTo("20261001");
            assertThat(row.getPstEndYmd()).isEqualTo("20261231");
        });
    }

    private Board saveFaq(String title, String scrtYn, String pstEndYmd) {
        return boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl(title)
                .pstCn("body")
                .useYn("Y")
                .scrtYn(scrtYn)
                .pstEndYmd(pstEndYmd)
                .build());
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
    @DisplayName("기본 search 테스트")
    void otherCustomMethodsTest() {
        // Given
        Board article = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Topic")
                .useYn("Y")
                .build();
        boardRepository.save(article);
        em.flush();
        em.clear();

        // search (returning Board entities)
        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(testMaster.getBbsId());
        Page<Board> results = boardRepository.search(condition, PageRequest.of(0, 10));
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getPstTtl()).isEqualTo("Topic");
    }

    // ── [2026-10-23 ADR-0040 결정 3·4] 예약 글 집행과 게시 기준일 정렬 ─────────────────────────────

    private Board savePeriodPost(String title, String startYmd, String userId) {
        return boardRepository.save(Board.builder()
                .bbsId(testMaster.getBbsId()).pstTtl(title).pstCn("body").useYn("Y").scrtYn("N")
                .userId(userId).pstBgngYmd(startYmd).build());
    }

    @Test
    @DisplayName("예약 글(시작일이 기준일 뒤)은 남의 목록 content·count·통계에서 빠지고 작성자·조회 대행 권한자에게는 남는다")
    void searchArticlesHidesScheduledPostsFromOthers() {
        savePeriodPost("start-marker tomorrow", "20261024", "ESNTL_AUTHOR");
        savePeriodPost("start-marker today", TODAY, "ESNTL_AUTHOR");
        savePeriodPost("start-marker blank", "", "ESNTL_AUTHOR");
        savePeriodPost("start-marker none", null, "ESNTL_AUTHOR");
        savePeriodPost("start-marker yesterday", "20261022", "ESNTL_AUTHOR");
        em.flush();
        em.clear();

        BoardSearchCondition other = visibleCondition("ESNTL_OTHER", false);
        other.setPostingOpenOn(TODAY);
        Page<BoardSearchResult> others = boardRepository.searchArticles(other, PageRequest.of(0, 10));
        assertThat(others.getContent()).extracting(BoardSearchResult::getPstTtl)
                .containsExactlyInAnyOrder("start-marker today", "start-marker blank", "start-marker none",
                        "start-marker yesterday");
        assertThat(others.getTotalElements()).as("count 도 같은 술어다 — 페이지 수로 예약 글이 드러나지 않는다").isEqualTo(4);
        assertThat(boardRepository.aggregateVisibleStats(other).totalArticles())
                .as("게시판 통계도 같은 술어다").isEqualTo(4);

        BoardSearchCondition author = visibleCondition("ESNTL_AUTHOR", false);
        author.setPostingOpenOn(TODAY);
        assertThat(boardRepository.searchArticles(author, PageRequest.of(0, 10)).getTotalElements())
                .as("작성자는 자기 예약 글을 본다").isEqualTo(5);

        BoardSearchCondition readAll = visibleCondition(null, true);
        assertThat(boardRepository.searchArticles(readAll, PageRequest.of(0, 10)).getTotalElements())
                .as("조회 대행 권한자는 기준일이 비어 기간 조건을 받지 않는다").isEqualTo(5);
    }

    @Test
    @DisplayName("게시 상태 조건은 서버 기준일로 SCHEDULED·POSTING·ENDED 를 가르고 단건 판정과 같은 우선순위다")
    void searchArticlesFiltersByPostingStatus() {
        savePeriodPost("status scheduled", "20261024", "ESNTL_AUTHOR");
        Board posting = savePeriodPost("status posting", TODAY, "ESNTL_AUTHOR");
        Board ended = savePeriodPost("status ended", null, "ESNTL_AUTHOR");
        Board reversed = savePeriodPost("status reversed", "20261030", "ESNTL_AUTHOR");
        em.flush();
        em.createNativeQuery("UPDATE tb_bbs_item SET pst_end_ymd = '20261022' WHERE pst_sn IN (:ids)")
                .setParameter("ids", List.of(ended.getPstSn(), reversed.getPstSn())).executeUpdate();
        em.createNativeQuery("UPDATE tb_bbs_item SET pst_end_ymd = :today WHERE pst_sn = :id")
                .setParameter("today", TODAY).setParameter("id", posting.getPstSn()).executeUpdate();
        em.clear();

        for (var expected : java.util.Map.of(
                nuri.business.service.board.dto.PostingStatus.SCHEDULED, List.of("status scheduled"),
                nuri.business.service.board.dto.PostingStatus.POSTING, List.of("status posting"),
                // 시작일이 종료일보다 뒤이고 종료일이 지났으면 ENDED 다 — 종료를 먼저 본다(D-5).
                nuri.business.service.board.dto.PostingStatus.ENDED, List.of("status ended", "status reversed")).entrySet()) {
            BoardSearchCondition readAll = visibleCondition(null, true);
            readAll.setBaseYmd(TODAY);
            readAll.setPostingStatus(expected.getKey());
            assertThat(boardRepository.searchArticles(readAll, PageRequest.of(0, 10)).getContent())
                    .as("%s", expected.getKey())
                    .extracting(BoardSearchResult::getPstTtl)
                    .containsExactlyInAnyOrderElementsOf(expected.getValue());
        }

        // 일반 사용자에게는 가시성 안에서만 좁혀진다 — 남의 예약 글은 SCHEDULED 조건으로도 보이지 않는다.
        BoardSearchCondition other = visibleCondition("ESNTL_OTHER", false);
        other.setPostingOpenOn(TODAY);
        other.setBaseYmd(TODAY);
        other.setPostingStatus(nuri.business.service.board.dto.PostingStatus.SCHEDULED);
        assertThat(boardRepository.searchArticles(other, PageRequest.of(0, 10)).getTotalElements()).isZero();
    }

    @Test
    @DisplayName("공개 FAQ 목록·상세는 예약 글을 권한과 상관없이 뺀다")
    void publicFaqExcludesScheduledPosts() {
        Board scheduled = savePeriodPost("faq-start-marker tomorrow", "20261024", "ESNTL_AUTHOR");
        Board startsToday = savePeriodPost("faq-start-marker today", TODAY, "ESNTL_AUTHOR");
        em.flush();
        em.clear();

        assertThat(boardRepository.searchPublicFaqArticles(testMaster.getBbsId(), "faq-start-marker", TODAY,
                PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getPstTtl).containsExactly("faq-start-marker today");
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), scheduled.getPstSn(), TODAY)).isEmpty();
        assertThat(boardRepository.findPublicArticleDetail(testMaster.getBbsId(), startsToday.getPstSn(), TODAY)).isPresent();
    }

    /**
     * 게시 기준일 = 작성일자와 게시 시작일 중 늦은 값. A(작성 10-01·시작 10-20)가 맨 위, 같은 기준일 10-15 의 E·D·F·C 는 작성일시
     * 내림차순, 같은 작성일시면 작성 순번 내림차순, 기준일 10-10 의 B 가 마지막이다. 'views'·'comments' 는 그 열을 먼저 본다.
     * 작성일시가 없는 행의 위치(NULLS LAST)는 H2 와 PostgreSQL 의 기본 NULL 정렬이 달라 BoardOperationsPostgresIntegrationTest 가 본다.
     */
    @Test
    @DisplayName("기본·date·모르는 정렬은 게시 기준일 순이고 동률은 작성일시·작성 순번으로 가른다")
    void searchArticlesOrdersByPostingBaseDate() {
        Board a = boardRepository.save(Board.builder().bbsId(testMaster.getBbsId()).pstTtl("A").pstCn("b").useYn("Y")
                .sortOrdr(1L).ansSn(1L).pstBgngYmd("20261020").build());
        Board b = boardRepository.save(Board.builder().bbsId(testMaster.getBbsId()).pstTtl("B").pstCn("b").useYn("Y")
                .sortOrdr(2L).ansSn(1L).inqCnt(5).cmntCnt(5).build());
        Board c = boardRepository.save(Board.builder().bbsId(testMaster.getBbsId()).pstTtl("C").pstCn("b").useYn("Y")
                .sortOrdr(3L).ansSn(1L).pstBgngYmd("").build());
        Board d = boardRepository.save(Board.builder().bbsId(testMaster.getBbsId()).pstTtl("D").pstCn("b").useYn("Y")
                .sortOrdr(4L).ansSn(1L).pstBgngYmd("").build());
        Board e = boardRepository.save(Board.builder().bbsId(testMaster.getBbsId()).pstTtl("E").pstCn("b").useYn("Y")
                .sortOrdr(5L).ansSn(1L).pstBgngYmd("20261015").build());
        // 시작일(1012)이 작성일자(1015)보다 이른 글 — 기준일은 작성일자다. 작성일자를 8자리가 아닌 형식으로 만들면 이 글이 D 위로 간다.
        Board f = boardRepository.save(Board.builder().bbsId(testMaster.getBbsId()).pstTtl("F").pstCn("b").useYn("Y")
                .sortOrdr(6L).ansSn(1L).pstBgngYmd("20261012").build());
        em.flush();
        setCreatedAt(a, LocalDateTime.of(2026, 10, 1, 9, 0));
        setCreatedAt(b, LocalDateTime.of(2026, 10, 10, 9, 0));
        setCreatedAt(c, LocalDateTime.of(2026, 10, 15, 9, 0));
        setCreatedAt(d, LocalDateTime.of(2026, 10, 15, 10, 0));
        setCreatedAt(e, LocalDateTime.of(2026, 10, 15, 10, 0));
        setCreatedAt(f, LocalDateTime.of(2026, 10, 15, 9, 30));
        em.clear();

        for (String orderBy : java.util.Arrays.asList(null, "date", "latest")) {
            BoardSearchCondition condition = visibleCondition(null, true);
            condition.setOrderBy(orderBy);
            assertThat(boardRepository.searchArticles(condition, PageRequest.of(0, 10)).getContent())
                    .as("orderBy=%s", orderBy)
                    .extracting(BoardSearchResult::getPstTtl).containsExactly("A", "E", "D", "F", "C", "B");
        }
        for (String orderBy : List.of("views", "comments")) {
            BoardSearchCondition condition = visibleCondition(null, true);
            condition.setOrderBy(orderBy);
            assertThat(boardRepository.searchArticles(condition, PageRequest.of(0, 10)).getContent())
                    .as("orderBy=%s 는 그 열을 먼저 보고 같은 순서로 동률을 가른다", orderBy)
                    .extracting(BoardSearchResult::getPstTtl).containsExactly("B", "A", "E", "D", "F", "C");
        }
        assertThat(boardRepository.searchPublicFaqArticles(testMaster.getBbsId(), null, "20261031", PageRequest.of(0, 10))
                .getContent())
                .as("공개 FAQ 도 같은 게시 기준일 순이다")
                .extracting(BoardSearchResult::getPstTtl).containsExactly("A", "E", "D", "F", "C", "B");
    }

    @Test
    @DisplayName("목록·상세 projection 은 수정 요청이 돌려보낼 게시글 버전을 싣는다")
    void projectionsCarryPostVersion() {
        Board saved = savePeriodPost("version-marker", null, "ESNTL_AUTHOR");
        em.flush();
        em.clear();
        BoardSearchCondition condition = visibleCondition(null, true);
        assertThat(boardRepository.searchArticles(condition, PageRequest.of(0, 10)).getContent())
                .singleElement().extracting(BoardSearchResult::getVersion).isEqualTo(0);
        assertThat(boardRepository.findActiveArticleDetail(testMaster.getBbsId(), saved.getPstSn()))
                .get().extracting(BoardDetailResult::getVersion).isEqualTo(0);
    }

    // ── [ADR-0040 결정 5] 상단 고정 — 상한 집계·고정 쓰기·고정 조건·고정 우선 정렬 ─────────────────────────────

    private Board savePinPost(String bbsId, String title, String scrtYn, String startYmd, String endYmd) {
        return boardRepository.save(Board.builder()
                .bbsId(bbsId).pstTtl(title).pstCn("body").useYn("Y").scrtYn(scrtYn)
                .pstBgngYmd(startYmd).pstEndYmd(endYmd).build());
    }

    private void markPinned(Board row, String yn, String endYmd) {
        em.createNativeQuery("UPDATE tb_bbs_item SET upend_fix_yn = :yn, upend_fix_end_ymd = :endYmd WHERE pst_sn = :id")
                .setParameter("yn", yn).setParameter("endYmd", endYmd).setParameter("id", row.getPstSn()).executeUpdate();
    }

    private BoardSearchCondition pinCondition() {
        BoardSearchCondition condition = visibleCondition(null, true);
        condition.setBaseYmd(TODAY);
        condition.setPinFirst(true);
        return condition;
    }

    @Test
    @DisplayName("🚨 상한 집계는 기준일에 고정 중인 지우지 않은 글만 센다 — 비밀·게시 종료·예약 고정 글은 세고, 만료·삭제·다른 게시판은 뺀다")
    void countActivePinsCountsEveryLivePinOfTheBoard() {
        boardMasterRepository.save(BoardMaster.builder().bbsId("BBS_PIN_OTHER").bbsTtl("other")
                .bbsTypeCd("COM004").bbsAtrbCd("COM009").useYn("Y").build());
        String bbs = testMaster.getBbsId();
        Board endsToday = savePinPost(bbs, "pin ends today", "N", null, null);
        Board expired = savePinPost(bbs, "pin expired", "N", null, null);
        Board secret = savePinPost(bbs, "pin secret", "Y", null, null);
        Board postingEnded = savePinPost(bbs, "pin posting ended", "N", null, "20261001");
        Board scheduled = savePinPost(bbs, "pin scheduled", "N", "20261120", null);
        Board deleted = savePinPost(bbs, "pin deleted", "N", null, null);
        Board unpinned = savePinPost(bbs, "not pinned", "N", null, null);
        Board otherBoard = savePinPost("BBS_PIN_OTHER", "pin other board", "N", null, null);
        em.flush();
        markPinned(endsToday, "Y", TODAY);
        markPinned(expired, "Y", "20261022");
        for (Board row : List.of(secret, postingEnded, scheduled, deleted, otherBoard)) {
            markPinned(row, "Y", "20261231");
        }
        em.createNativeQuery("UPDATE tb_bbs_item SET use_yn = 'N' WHERE pst_sn = :id")
                .setParameter("id", deleted.getPstSn()).executeUpdate();
        em.clear();

        assertThat(boardRepository.countActivePins(bbs, TODAY))
                .as("종료일 당일·비밀·게시 종료·예약 고정 글을 세고 만료·삭제·다른 게시판 글은 빼야 한다").isEqualTo(4);
        assertThat(boardRepository.countActivePins(bbs, "20261024")).as("다음 날에는 오늘 끝나는 고정이 빠진다").isEqualTo(3);
    }

    @Test
    @DisplayName("🚨 고정 쓰기는 게시글 버전·수정 시각·수정자를 바꾸지 않고, 경로 게시판의 지우지 않은 글만 바꾼다")
    void updatePinLeavesVersionAndAuditColumnsUntouched() {
        Board row = savePinPost(testMaster.getBbsId(), "pin write", "N", null, null);
        Board gone = savePinPost(testMaster.getBbsId(), "pin write deleted", "N", null, null);
        em.flush();
        em.createNativeQuery("UPDATE tb_bbs_item SET use_yn = 'N' WHERE pst_sn = :id")
                .setParameter("id", gone.getPstSn()).executeUpdate();
        em.clear();
        Object[] before = (Object[]) em.createNativeQuery(
                        "SELECT version, mdfcn_dt, last_mdfr_id FROM tb_bbs_item WHERE pst_sn = :id")
                .setParameter("id", row.getPstSn()).getSingleResult();

        assertThat(boardRepository.updatePin(testMaster.getBbsId(), List.of(row.getPstSn()), "Y", "20261130")).isEqualTo(1);
        assertThat(boardRepository.updatePin("BBS_ELSEWHERE", List.of(row.getPstSn()), "N", null))
                .as("다른 게시판 경로로는 쓰지 않는다").isZero();
        assertThat(boardRepository.updatePin(testMaster.getBbsId(), List.of(gone.getPstSn()), "Y", "20261130"))
                .as("지운 글에는 쓰지 않는다").isZero();

        Object[] after = (Object[]) em.createNativeQuery(
                        "SELECT version, mdfcn_dt, last_mdfr_id, upend_fix_yn, upend_fix_end_ymd FROM tb_bbs_item WHERE pst_sn = :id")
                .setParameter("id", row.getPstSn()).getSingleResult();
        assertThat(after[0]).as("버전").isEqualTo(before[0]);
        assertThat(after[1]).as("수정 시각").isEqualTo(before[1]);
        assertThat(after[2]).as("수정자").isEqualTo(before[2]);
        assertThat(String.valueOf(after[3])).isEqualTo("Y");
        assertThat(String.valueOf(after[4])).isEqualTo("20261130");

        assertThat(boardRepository.updatePin(testMaster.getBbsId(), List.of(row.getPstSn()), "N", null)).isEqualTo(1);
        Board reread = boardRepository.findById(row.getPstSn()).orElseThrow();
        assertThat(reread.getUpendFixYn()).isEqualTo("N");
        assertThat(reread.getUpendFixEndYmd()).as("해제는 종료일을 비운다").isNull();
    }

    @Test
    @DisplayName("🚨 고정 중인 글은 기본·date 정렬에서 맨 앞이고(종료일 당일 포함), 조회순·댓글순과 고정 우선을 끈 경로에서는 일반 위치다")
    void pinnedPostsLeadDefaultOrderOnly() {
        String bbs = testMaster.getBbsId();
        Board pinnedOld = savePinPost(bbs, "pinned old", "N", null, null);
        Board expiredPin = savePinPost(bbs, "expired pin", "N", null, null);
        Board newest = boardRepository.save(Board.builder().bbsId(bbs).pstTtl("newest").pstCn("b").useYn("Y")
                .inqCnt(9).build());
        em.flush();
        setCreatedAt(pinnedOld, LocalDateTime.of(2026, 10, 1, 9, 0));
        setCreatedAt(expiredPin, LocalDateTime.of(2026, 10, 5, 9, 0));
        setCreatedAt(newest, LocalDateTime.of(2026, 10, 20, 9, 0));
        markPinned(pinnedOld, "Y", TODAY);
        markPinned(expiredPin, "Y", "20261022");
        em.clear();

        for (String orderBy : java.util.Arrays.asList(null, "date")) {
            BoardSearchCondition condition = pinCondition();
            condition.setOrderBy(orderBy);
            assertThat(boardRepository.searchArticles(condition, PageRequest.of(0, 10)).getContent())
                    .as("orderBy=%s", orderBy)
                    .extracting(BoardSearchResult::getPstTtl).containsExactly("pinned old", "newest", "expired pin");
        }
        BoardSearchCondition views = pinCondition();
        views.setOrderBy("views");
        assertThat(boardRepository.searchArticles(views, PageRequest.of(0, 10)).getContent())
                .as("조회순은 고정 우선을 두지 않는다")
                .extracting(BoardSearchResult::getPstTtl).containsExactly("newest", "expired pin", "pinned old");
        BoardSearchCondition global = pinCondition();
        global.setPinFirst(false);
        assertThat(boardRepository.searchArticles(global, PageRequest.of(0, 10)).getContent())
                .as("고정 우선을 끈 경로(통합 검색)는 일반 순서다")
                .extracting(BoardSearchResult::getPstTtl).containsExactly("newest", "expired pin", "pinned old");
        BoardSearchCondition tomorrow = pinCondition();
        tomorrow.setBaseYmd("20261024");
        assertThat(boardRepository.searchArticles(tomorrow, PageRequest.of(0, 10)).getContent())
                .as("종료일 다음 날에는 일반 위치다")
                .extracting(BoardSearchResult::getPstTtl).containsExactly("newest", "expired pin", "pinned old");
        assertThat(boardRepository.searchPublicFaqArticles(bbs, null, TODAY, PageRequest.of(0, 10)).getContent())
                .as("공개 FAQ 도 고정 중인 글이 먼저다")
                .extracting(BoardSearchResult::getPstTtl).containsExactly("pinned old", "newest", "expired pin");

        assertThat(boardRepository.searchArticles(pinCondition(), PageRequest.of(0, 10)).getContent())
                .as("목록 projection 은 고정 표시와 종료일을 싣는다")
                .filteredOn(row -> "pinned old".equals(row.getPstTtl()))
                .singleElement().satisfies(row -> {
                    assertThat(row.getUpendFixYn()).isEqualTo("Y");
                    assertThat(row.getUpendFixEndYmd()).isEqualTo(TODAY);
                });
        assertThat(boardRepository.findActiveArticleDetail(bbs, pinnedOld.getPstSn())).get()
                .extracting(BoardDetailResult::getUpendFixYn, BoardDetailResult::getUpendFixEndYmd)
                .containsExactly("Y", TODAY);
    }

    @Test
    @DisplayName("고정 조건: true 는 기준일에 고정 중인 글, false 는 그 밖의 글(종료일이 지난 옛 고정 포함)이다")
    void pinnedFilterUsesBaseDate() {
        String bbs = testMaster.getBbsId();
        Board active = savePinPost(bbs, "filter active", "N", null, null);
        Board expired = savePinPost(bbs, "filter expired", "N", null, null);
        savePinPost(bbs, "filter plain", "N", null, null);
        em.flush();
        markPinned(active, "Y", TODAY);
        markPinned(expired, "Y", "20261022");
        em.clear();

        BoardSearchCondition pinned = pinCondition();
        pinned.setPinned(true);
        assertThat(boardRepository.searchArticles(pinned, PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getPstTtl).containsExactly("filter active");
        assertThat(boardRepository.searchArticles(pinned, PageRequest.of(0, 10)).getTotalElements()).isEqualTo(1);
        BoardSearchCondition notPinned = pinCondition();
        notPinned.setPinned(false);
        assertThat(boardRepository.searchArticles(notPinned, PageRequest.of(0, 10)).getContent())
                .extracting(BoardSearchResult::getPstTtl).containsExactlyInAnyOrder("filter expired", "filter plain");
    }
}
