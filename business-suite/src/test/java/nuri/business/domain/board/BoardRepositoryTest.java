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
import nuri.foundation.domain.config.JpaConfig;
import nuri.foundation.security.audit.LoginUserAuditorAware;
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
                .bbsAttrCd("COM009")
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
                .ntcrId("USR_001")
                .ntcrNm("Tester")
                .build();
        Board saved = boardRepository.save(article);
        em.flush();
        em.clear();

        // When
        Optional<BoardDetailResult> result = boardRepository.findArticleDetail(saved.getPstId());

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getPstTtl()).isEqualTo("Detail Test Subject");
        assertThat(result.get().getBbsTtl()).isEqualTo("Integrated Test Board");
    }

    @Test
    @DisplayName("게시글 검색 테스트 (QueryDSL)")
    void searchArticlesTest() {
        // Given
        Board article1 = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Search Target 1")
                .pstCn("Content 1")
                .ntcrNm("User1")
                .useYn("Y")
                .build();
        Board article2 = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Other Topic")
                .pstCn("Special Content")
                .ntcrNm("Manager")
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
        assertThat(results.getContent().get(0).getFrstRegisterNm()).isEqualTo("Manager");
    }

    @Test
    @DisplayName("정렬 조건 검색 테스트 (views, comments, date)")
    void searchWithOrderTest() throws InterruptedException {
        // Given
        Board articleLow = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("Low")
                .inqireCo(10)
                .commentCnt(1)
                .useYn("Y")
                .build();
        boardRepository.save(articleLow);
        
        Thread.sleep(10);
        
        Board articleHigh = Board.builder()
                .bbsId(testMaster.getBbsId())
                .pstTtl("High")
                .inqireCo(100)
                .commentCnt(10)
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
        assertThat(results.getContent().get(0).getInqireCo()).isEqualTo(100);

        // comments desc
        condition.setOrderBy("comments");
        results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(results.getContent().get(0).getCommentCnt()).isEqualTo(10);

        // date desc
        condition.setOrderBy("date");
        results = boardRepository.searchArticles(condition, PageRequest.of(0, 10));
        assertThat(results.getContent().get(0).getPstTtl()).isEqualTo("High"); // saved later
    }

    @Test
    @DisplayName("날짜 기간 검색 테스트")
    void searchWithDateRangeTest() {
        // Given
        Board oldPost = Board.builder().bbsId(testMaster.getBbsId()).pstTtl("Old").useYn("Y").build();
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
        Board article = Board.builder().bbsId(testMaster.getBbsId()).pstTtl("Topic").useYn("Y").build();
        Board saved = boardRepository.save(article);
        em.flush();
        em.clear();

        // 1. findByIdCustom
        Optional<Board> found = boardRepository.findByIdCustom(saved.getPstId());
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
