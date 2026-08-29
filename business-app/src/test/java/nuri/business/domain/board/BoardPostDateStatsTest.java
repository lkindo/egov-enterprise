package nuri.business.domain.board;

import jakarta.persistence.EntityManager;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 게시물 날짜별 집계 계약.
 *
 * <p>── 왜 저장소 계층인가 ──────────────────────────────────────────────────────
 * 서비스 단위 테스트는 저장소를 mock 하므로 "게시판 저장소를 부르는가" 까지만 확인된다.
 * 이 질의의 진짜 위험은 <b>{@code use_yn = 'Y'} 를 빠뜨리는 것</b>인데, 그건 질의가 실제로
 * 실행돼야 드러난다. 네이티브 질의라 JPA {@code @Filter} 도 걸리지 않는다 —
 * 빠뜨리면 <b>논리 삭제된 글이 통계를 부풀린다</b>.
 *
 * <p>── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────
 * 게시물 통계 화면이 읽던 {@code ReportStatsService.getBbsStatsByDate} 는 실제로는
 * {@code dtaUseStatsRepository.countByDate} 를 불러 <b>자료이용현황과 완전히 같은 응답</b>을
 * 돌려주고 있었다. 게시글을 하나도 세지 않았고, 그 표에는 쓰는 코드가 없어(writer 0건)
 * 화면은 늘 비어 있었다.
 *
 * <p>── 날짜를 직접 넣는 이유 ──────────────────────────────────────────────────
 * {@code crt_dt} 는 {@code @CreatedDate} 인데 {@code @DataJpaTest} 슬라이스에는
 * {@code JpaConfig}(@EnableJpaAuditing)가 없어 채워지지 않는다(실측 — 저장만 하면 NULL 이라
 * BETWEEN 이 전부 탈락한다). 감사 설정을 이 테스트에서 켜는 대신 값을 명시해, 기간 안·밖을
 * 실제로 가르는 검사가 되게 한다.
 */
@DisplayName("게시물 날짜별 집계 통합 테스트")
class BoardPostDateStatsTest extends PersistenceTestSupport {

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private EntityManager em;

    private static final String FROM = "2026-08-01 00:00:00";
    private static final String TO = "2026-08-31 23:59:59";

    /** 글 하나를 만들고 등록일시를 명시한다. */
    private Board savePost(String title, String useYn, String crtDt) {
        Board saved = boardRepository.saveAndFlush(Board.builder()
                .bbsId("BBS_STATS")
                .pstTtl(title)
                .pstCn("본문")
                .userId("USR_A")
                .useYn(useYn)
                .build());
        em.createNativeQuery("UPDATE tb_bbs_item SET crt_dt = CAST(:crtDt AS TIMESTAMP) WHERE pst_sn = :pstSn")
                .setParameter("crtDt", crtDt)
                .setParameter("pstSn", saved.getPstSn())
                .executeUpdate();
        em.clear();
        return saved;
    }

    private long totalOf(List<Object[]> rows) {
        return rows.stream().mapToLong(row -> ((Number) row[1]).longValue()).sum();
    }

    @BeforeEach
    void setUp() {
        boardRepository.deleteAll();
        boardRepository.flush();
    }

    @Test
    @DisplayName("기간 안의 게시글을 날짜별로 센다")
    void countsPostsByDate() {
        savePost("8월 5일 글", "Y", "2026-08-05 10:00:00");
        savePost("8월 5일 글 2", "Y", "2026-08-05 15:00:00");
        savePost("8월 6일 글", "Y", "2026-08-06 09:00:00");

        List<Object[]> rows = boardRepository.countPostsByDate(FROM, TO);

        assertThat(totalOf(rows)).isEqualTo(3L);
        // 날짜별로 묶이므로 행은 2개(8/5, 8/6)다.
        assertThat(rows).hasSize(2);
    }

    @Test
    @DisplayName("논리 삭제된 글은 세지 않는다 — use_yn 을 빠뜨리면 통계가 부풀려진다")
    void excludesLogicallyDeletedPosts() {
        savePost("살아 있는 글", "Y", "2026-08-10 10:00:00");
        savePost("지운 글", "N", "2026-08-10 11:00:00");

        List<Object[]> rows = boardRepository.countPostsByDate(FROM, TO);

        assertThat(totalOf(rows)).isEqualTo(1L);
    }

    @Test
    @DisplayName("기간 밖은 세지 않는다")
    void respectsDateRange() {
        savePost("기간 안", "Y", "2026-08-15 10:00:00");
        savePost("기간 전", "Y", "2026-07-31 23:59:59");
        savePost("기간 후", "Y", "2026-09-01 00:00:01");

        List<Object[]> rows = boardRepository.countPostsByDate(FROM, TO);

        assertThat(totalOf(rows)).isEqualTo(1L);
    }

    @Test
    @DisplayName("결과는 날짜 문자열과 건수 두 칸이다 — 화면이 그 형태로 읽는다")
    void returnsDateAndCount() {
        savePost("글", "Y", "2026-08-20 10:00:00");

        List<Object[]> rows = boardRepository.countPostsByDate(FROM, TO);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0)).hasSize(2);
        assertThat(String.valueOf(rows.get(0)[0])).isEqualTo("2026-08-20");
        assertThat(((Number) rows.get(0)[1]).longValue()).isEqualTo(1L);
    }
}
