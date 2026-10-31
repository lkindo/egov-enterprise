package nuri.api.schema;

import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.domain.board.BoardSearchResult;
import nuri.business.domain.board.DtaUseStatsRepository;
import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardPostPinRequest;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.PostingStatus;
import nuri.business.service.file.FileService;
import nuri.business.domain.file.FileDetailRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 게시판 운영 관리 B 배치(ADR-0040)의 질의를 실제 PostgreSQL 에서 본다. B1 — 게시 기간(시작일·종료일) 집행과 게시 기준일
 * 정렬(결정 3·4), B2 — 상단 고정 우선 정렬·고정 조건·상한 집계와 동시 고정의 상한 직렬화(결정 5), B3 — 같은 사람의 동시 추천
 * 취소가 추천 수를 한 번만 줄이는 것(결정 6)이다.
 *
 * <p>[왜 H2 만으로는 안 되나] 게시 기준일은 HQL {@code format(crtDt as 'yyyyMMdd')} 로 작성일자를 문자열로 바꾸는데, 이 함수는
 * 방언마다 번역이 다르다(H2 {@code formatdatetime}, PostgreSQL {@code to_char}). 또 내림차순에서 NULL 의 기본 위치가 두 DB 에서
 * 반대다(H2 는 뒤, PostgreSQL 은 앞) — 작성일시가 없는 행을 뒤로 보내는 {@code nullsLast} 는 PostgreSQL 에서만 검증된다.
 * H2 시험(BoardRepositoryTest)이 같은 순서를 보더라도 운영 DB 의 번역과 NULL 위치는 여기서만 증명된다.
 *
 * <p>[상한의 직렬화] 같은 게시판의 동시 고정은 마스터 행 비관 잠금으로 줄을 선다. 잠금이 없으면 두 요청이 모두 커밋 전 집계(0건)를
 * 보고 상한 1 을 함께 넘긴다 — 행 잠금 의미는 H2 와 달라 여기서만 증명된다.
 *
 * <p>[추천 취소의 한 번 감소] 감소의 근거는 추천 이력 DELETE 의 영향 수 하나다. READ COMMITTED 에서 같은 행을 지우는 두 번째 DELETE 는
 * 첫 커밋을 기다렸다가 0행이 되므로 감소가 한 번이다. 이 대기와 재평가는 H2 의 잠금 의미와 달라 여기서 증명한다.
 *
 * <p>고유한 게시판 ID 로 행을 넣고 시험마다 지운다. 질의 시험의 기준일은 고정값(2026-10-23)을 넘긴다.
 */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("게시판 운영 질의(PostgreSQL) — 게시 기간 집행과 게시 기준일 정렬")
class BoardOperationsPostgresIntegrationTest {

    @TempDir static java.nio.file.Path storageRoot;
    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry properties) {
        properties.add("file.upload.path", () -> storageRoot.toString());
    }

    private static final String TODAY = "20261023";

    @Autowired private BoardRepository boards;
    @Autowired private BoardService boardService;
    @Autowired private DtaUseStatsRepository usage;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private javax.sql.DataSource dataSource;
    @Autowired private FileService files;
    @Autowired private FileDetailRepository fileDetails;
    private Long attachment;

    private String bbsId;
    /** 예약 글 작성자 — 게시글의 user_id 는 사용자 표를 가리키므로(FK) 실제 사용자 행을 둔다. 나머지 글은 작성자를 비운다. */
    private String author;

    @BeforeEach
    void seedBoard() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        bbsId = "BBSOPS_" + suffix;
        author = "BOS" + suffix;
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'board operations fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))",
                author, author);
        jdbc.update("INSERT INTO tb_bbs_master (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty,"
                + " file_atch_psblty_yn, use_yn) VALUES (?, '운영 질의 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')", bbsId);
        // 게시 기준일(작성일자·시작일 중 늦은 값): S 1030, A 1020, E·D·F·C 1015(작성일시 D=E 10:00 > F 09:30 > C 09:00, 작성 순번
        //   E > D), B 1010, X 1002(종료일 지남), N 작성일시 없음(기준일 없음 → 맨 뒤). F 는 시작일(1012)이 작성일자보다 이르다 —
        //   작성일자를 8자리가 아닌 형식(예: 2026-10-15)으로 바꾸면 '20261012' 가 더 큰 문자열이 되어 F 가 D 위로 올라간다.
        post("S", 1, LocalDateTime.of(2026, 10, 16, 9, 0), "20261030", null, author, 0);
        post("A", 2, LocalDateTime.of(2026, 10, 1, 9, 0), "20261020", null, null, 0);
        post("B", 3, LocalDateTime.of(2026, 10, 10, 9, 0), null, null, null, 5);
        post("C", 4, LocalDateTime.of(2026, 10, 15, 9, 0), "", null, null, 0);
        post("D", 5, LocalDateTime.of(2026, 10, 15, 10, 0), "", null, null, 0);
        post("E", 6, LocalDateTime.of(2026, 10, 15, 10, 0), "20261015", null, null, 0);
        post("X", 7, LocalDateTime.of(2026, 10, 2, 9, 0), null, "20261022", null, 0);
        post("N", 8, null, null, null, null, 0);
        post("F", 9, LocalDateTime.of(2026, 10, 15, 9, 30), "20261012", null, null, 0);
    }

    @AfterEach
    void removeBoard() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_bbs_rcmdtn_hstry WHERE pst_sn IN (SELECT pst_sn FROM tb_bbs_item WHERE bbs_id = ?)", bbsId);
        jdbc.update("DELETE FROM tb_bbs_chg_hstry WHERE bbs_id = ?", bbsId);
        jdbc.update("DELETE FROM tb_dta_use_stats WHERE bbs_id = ?", bbsId);
        jdbc.update("DELETE FROM tb_bbs_item WHERE bbs_id = ?", bbsId);
        jdbc.update("DELETE FROM tb_bbs_master WHERE bbs_id = ?", bbsId);
        if (attachment != null) {
            jdbc.update("DELETE FROM tb_file_detail WHERE atch_file_sn = ?", attachment);
            jdbc.update("DELETE FROM tb_file_master WHERE atch_file_sn = ?", attachment);
        }
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id = ?", author);
    }

    @Test
    @DisplayName("PostgreSQL 17 에서 게시 기준일 정렬(작성일시 없음은 맨 뒤)과 동률 처리가 번역된다")
    void postingBaseOrderTranslatesOnPostgres() {
        assertThat(jdbc.queryForObject("SELECT current_setting('server_version_num')::int", Integer.class))
                .as("운영과 같은 PostgreSQL 17 이상").isGreaterThanOrEqualTo(170000);

        assertThat(titles(readAll(null))).containsExactly("S", "A", "E", "D", "F", "C", "B", "X", "N");
        assertThat(titles(readAll("date"))).containsExactly("S", "A", "E", "D", "F", "C", "B", "X", "N");
        assertThat(titles(readAll("views"))).as("조회순은 그 열을 먼저 보고 같은 순서로 동률을 가른다")
                .containsExactly("B", "S", "A", "E", "D", "F", "C", "X", "N");
    }

    @Test
    @DisplayName("PostgreSQL 에서 예약·종료 글은 남의 목록·count 에서 빠지고 작성자에게는 남는다")
    void postingWindowAppliesOnPostgres() {
        BoardSearchCondition other = visible("ESNTL_OTHER");
        assertThat(titles(other)).containsExactly("A", "E", "D", "F", "C", "B", "N");
        assertThat(inTransaction(() -> boards.searchArticles(other, PageRequest.of(0, 20)).getTotalElements()))
                .isEqualTo(7);
        assertThat(titles(visible(author))).as("작성자는 자기 예약 글을 본다")
                .containsExactly("S", "A", "E", "D", "F", "C", "B", "N");
    }

    @Test
    @DisplayName("PostgreSQL 에서 게시 상태 조건이 단건 판정과 같은 우선순위로 거른다")
    void postingStatusFilterAppliesOnPostgres() {
        assertThat(titles(withStatus(PostingStatus.SCHEDULED))).containsExactly("S");
        assertThat(titles(withStatus(PostingStatus.ENDED))).containsExactly("X");
        assertThat(titles(withStatus(PostingStatus.POSTING))).containsExactly("A", "E", "D", "F", "C", "B", "N");
    }

    @Test
    @DisplayName("PostgreSQL 에서 공개 FAQ 목록도 같은 게시 기간과 게시 기준일 순이다")
    void publicFaqUsesPostingWindowAndOrderOnPostgres() {
        List<String> titles = inTransaction(() -> boards.searchPublicFaqArticles(bbsId, null, TODAY, PageRequest.of(0, 20))
                .getContent().stream().map(BoardSearchResult::getPstTtl).toList());
        assertThat(titles).containsExactly("A", "E", "D", "F", "C", "B", "N");
    }

    @Test
    @DisplayName("PostgreSQL 에서 고정 중인 글이 기본 정렬·공개 FAQ 의 맨 앞이고(종료일 당일 포함) 조회순은 그대로다, 상한 집계도 같은 판정이다")
    void pinFirstOrderAndCountOnPostgres() {
        pin("F", "Y", TODAY);
        pin("C", "Y", "20261022");

        BoardSearchCondition pinFirst = readAll(null);
        pinFirst.setPinFirst(true);
        assertThat(titles(pinFirst)).containsExactly("F", "S", "A", "E", "D", "C", "B", "X", "N");
        BoardSearchCondition views = readAll("views");
        views.setPinFirst(true);
        assertThat(titles(views)).as("조회순은 고정 우선을 두지 않는다")
                .containsExactly("B", "S", "A", "E", "D", "F", "C", "X", "N");
        BoardSearchCondition pinnedOnly = readAll(null);
        pinnedOnly.setPinned(true);
        assertThat(titles(pinnedOnly)).containsExactly("F");
        BoardSearchCondition notPinned = readAll(null);
        notPinned.setPinned(false);
        assertThat(titles(notPinned)).containsExactly("S", "A", "E", "D", "C", "B", "X", "N");

        List<String> faq = inTransaction(() -> boards.searchPublicFaqArticles(bbsId, null, TODAY, PageRequest.of(0, 20))
                .getContent().stream().map(BoardSearchResult::getPstTtl).toList());
        assertThat(faq).containsExactly("F", "A", "E", "D", "C", "B", "N");
        assertThat(inTransaction(() -> boards.countActivePins(bbsId, TODAY))).isEqualTo(1L);
        assertThat(inTransaction(() -> boards.countActivePins(bbsId, "20261024"))).isZero();
    }

    /**
     * 상한 1 인 게시판에서 두 글을 동시에 고정한다. 순서를 운에 맡기지 않는다 — 선행 고정이 마스터 행 잠금을 쥔 채 커밋을 미루고,
     * 후행 고정이 같은 마스터 행 잠금을 실제로 기다리는 것을 {@code pg_stat_activity} 로 확인한 뒤에야 선행을 커밋시킨다. 후행은 잠금을
     * 얻은 뒤 선행이 커밋한 고정을 세므로 상한(INVALID_STATE)으로 거부돼야 한다. 잠금을 걷거나 집계를 잠금 전에 하면 후행이 0건을 보고
     * 고정해 두 글이 모두 고정된다.
     */
    @Test
    @DisplayName("PostgreSQL 에서 상한 1 게시판의 동시 고정은 하나만 성공하고 다른 하나는 상한으로 거부된다 — 마스터 행 잠금으로 줄을 선다")
    void concurrentPinsAreSerializedByMasterLock() throws Exception {
        jdbc.update("UPDATE tb_bbs_master SET upend_fix_psblty_yn = 'Y', upend_fix_uplmt_nocs = 1 WHERE bbs_id = ?", bbsId);
        long first = pstSn("A");
        long second = pstSn("B");
        String application = "board-pin-" + bbsId;
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var leadingPid = new AtomicInteger();
        List<Future<RuntimeException>> attempts = new ArrayList<>();
        List<Wait> waits = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(2)) {
            try {
                attempts.add(executor.submit(() -> attempt(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                    leadingPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    boardService.updatePostPin(bbsId, first, new BoardPostPinRequest("Y", null));
                    applied.countDown();
                    await(release);
                }))));
                assertThat(applied.await(15, TimeUnit.SECONDS)).as("선행 고정이 마스터 행 잠금을 쥔 채 고정을 반영함").isTrue();
                attempts.add(executor.submit(() -> attempt(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                    jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                    boardService.updatePostPin(bbsId, second, new BoardPostPinRequest("Y", null));
                }))));
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(4);
                while (waits.isEmpty() && !attempts.get(1).isDone() && System.nanoTime() < deadline) {
                    jdbc.query("""
                            SELECT pid, lower(query) AS statement, pg_blocking_pids(pid) AS blockers
                            FROM pg_stat_activity
                            WHERE datname = current_database() AND wait_event_type = 'Lock' AND application_name = ?
                            """, (RowCallbackHandler) row -> waits.add(new Wait(row.getInt("pid"), row.getString("statement"),
                            List.of((Integer[]) row.getArray("blockers").getArray()))), application);
                    Thread.sleep(20);
                }
            } finally {
                release.countDown();
            }
            RuntimeException leading = attempts.get(0).get(30, TimeUnit.SECONDS);
            RuntimeException contender = attempts.get(1).get(30, TimeUnit.SECONDS);

            assertThat(leading).as("선행 고정은 성공한다").isNull();
            assertThat(contender).as("후행 고정은 선행이 커밋한 고정을 세고 상한으로 거부된다")
                    .isInstanceOfSatisfying(BusinessException.class, failure -> {
                        assertThat(failure.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_STATE);
                        assertThat(failure.getMessage()).contains("최대 1건까지 둡니다(지금 1건)");
                    });
            assertThat(waits).as("후행 고정은 실제 DB 잠금을 기다렸다").isNotEmpty();
            assertThat(waits.getFirst().statement()).as("후행 고정이 기다린 문장은 마스터 행 잠금 조회다")
                    .contains("tb_bbs_master").containsPattern("for (no key )?update");
            assertThat(waits.getFirst().blockers()).as("후행을 막은 것은 선행 고정이다").contains(leadingPid.get());
        }
        assertThat(jdbc.queryForList("SELECT pst_ttl FROM tb_bbs_item WHERE bbs_id = ? AND upend_fix_yn = 'Y' ORDER BY pst_ttl",
                String.class, bbsId)).as("상한 1 을 넘지 않는다").containsExactly("A");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_bbs_chg_hstry WHERE bbs_id = ? AND pst_sn = ?",
                Long.class, bbsId, second)).as("거부된 고정은 이력을 남기지 않는다").isZero();
        assertThat(jdbc.queryForObject("SELECT version FROM tb_bbs_item WHERE pst_sn = ?", Integer.class, first))
                .as("고정은 게시글 버전을 올리지 않는다").isZero();
    }

    /**
     * 같은 사람이 같은 글의 추천을 동시에 두 번 취소한다. 선행 취소가 추천 이력 행을 지우고 추천 수를 줄인 채 커밋을 미루고, 후행 취소가
     * 같은 이력 행 DELETE 에서 실제로 기다리는 것을 {@code pg_stat_activity} 로 확인한 뒤에야 선행을 커밋시킨다. 후행 DELETE 는 커밋된
     * 삭제를 보고 0행이 되므로 추천 수를 줄이지 않는다 — 이력 없는 옛 수 5 에 내 추천 1 을 더한 6 이 정확히 5 로 돌아간다. 있는지 먼저
     * 읽고 지우는 방식이면 두 요청이 모두 '있음' 을 보고 4 가 된다.
     */
    @Test
    @DisplayName("PostgreSQL 에서 같은 사람의 동시 추천 취소는 추천 수를 한 번만 줄인다 — 두 번째 DELETE 는 첫 커밋을 기다렸다가 0행이다")
    void concurrentCancelsDecrementOnce() throws Exception {
        long post = pstSn("A");
        jdbc.update("UPDATE tb_bbs_item SET like_cnt = 5 WHERE pst_sn = ?", post); // 이력 없는 옛 추천 수(GAP-DOMAIN-001)
        assertThat(attempt(LIKE_PERMISSIONS, () -> new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                assertThat(boardService.incrementLike(bbsId, post)).isEqualTo(6)))).isNull();

        String application = "board-unlike-" + bbsId;
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var leadingPid = new AtomicInteger();
        var contenderCount = new java.util.concurrent.atomic.AtomicReference<Integer>();
        List<Future<RuntimeException>> attempts = new ArrayList<>();
        List<Wait> waits = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(2)) {
            try {
                attempts.add(executor.submit(() -> attempt(LIKE_PERMISSIONS, () -> new TransactionTemplate(transactionManager)
                        .executeWithoutResult(status -> {
                            leadingPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                            assertThat(boardService.cancelLike(bbsId, post)).isEqualTo(5);
                            applied.countDown();
                            await(release);
                        }))));
                assertThat(applied.await(15, TimeUnit.SECONDS)).as("선행 취소가 이력 행 잠금을 쥔 채 감소를 반영함").isTrue();
                attempts.add(executor.submit(() -> attempt(LIKE_PERMISSIONS, () -> new TransactionTemplate(transactionManager)
                        .executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            contenderCount.set(boardService.cancelLike(bbsId, post));
                        }))));
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(4);
                while (waits.isEmpty() && !attempts.get(1).isDone() && System.nanoTime() < deadline) {
                    jdbc.query("""
                            SELECT pid, lower(query) AS statement, pg_blocking_pids(pid) AS blockers
                            FROM pg_stat_activity
                            WHERE datname = current_database() AND wait_event_type = 'Lock' AND application_name = ?
                            """, (RowCallbackHandler) row -> waits.add(new Wait(row.getInt("pid"), row.getString("statement"),
                            List.of((Integer[]) row.getArray("blockers").getArray()))), application);
                    Thread.sleep(20);
                }
            } finally {
                release.countDown();
            }
            assertThat(attempts.get(0).get(30, TimeUnit.SECONDS)).as("선행 취소는 성공한다").isNull();
            assertThat(attempts.get(1).get(30, TimeUnit.SECONDS)).as("후행 취소도 오류 없이 끝난다(멱등)").isNull();
            assertThat(contenderCount.get()).as("후행 취소는 줄이지 않고 지금 수를 돌려준다").isEqualTo(5);
            assertThat(waits).as("후행 취소는 실제 DB 잠금을 기다렸다").isNotEmpty();
            assertThat(waits.getFirst().statement()).as("후행 취소가 기다린 문장은 추천 이력 DELETE 다")
                    .contains("delete from tb_bbs_rcmdtn_hstry");
            assertThat(waits.getFirst().blockers()).as("후행을 막은 것은 선행 취소다").contains(leadingPid.get());
        }
        assertThat(jdbc.queryForObject("SELECT like_cnt FROM tb_bbs_item WHERE pst_sn = ?", Integer.class, post))
                .as("옛 수 5 는 그대로이고 내 추천 하나만 빠졌다").isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_bbs_rcmdtn_hstry WHERE pst_sn = ?", Long.class, post)).isZero();
        assertThat(jdbc.queryForObject("SELECT version FROM tb_bbs_item WHERE pst_sn = ?", Integer.class, post))
                .as("추천·취소는 게시글 버전을 올리지 않는다").isZero();
    }

    /** 추천·취소 시험의 주체 권한 — 서비스는 operation 권한을 다시 보지 않으므로 표시용이다. */
    private static final List<String> LIKE_PERMISSIONS = List.of("BOARD_LIKE");

    @ParameterizedTest
    @ValueSource(strings = {"commit", "rollback", "optimistic-conflict"})
    void actualMultipartAppendWaitsOnFileMasterAndCommitOrRollbackKeepsRowsAndStorageConsistent(String outcome) throws Exception {
        boolean rollback = !outcome.equals("commit");
        var principal = CustomUserDetails.builder().userId(author).esntlId(author).enabled(true)
                .groups(List.of()).permissions(List.of("BOARD_UPDATE")).build();
        var authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        attachment = files.uploadBoardFiles(List.of(new MockMultipartFile("files", "initial.txt", "text/plain", "initial".getBytes(java.nio.charset.StandardCharsets.UTF_8))));
        var initial = fileDetails.findByFileMasterAtchFileSnAndAtchFileSeq(attachment, 1).orElseThrow();
        java.nio.file.Path directory = storageRoot.resolve(initial.getFileStrgPath());
        long post = pstSn("A");
        jdbc.update("UPDATE tb_bbs_master SET file_atch_psblty_yn='Y', atch_psblty_file_qty=5 WHERE bbs_id=?", bbsId);
        jdbc.update("UPDATE tb_bbs_item SET user_id=?, frst_rgtr_id=?, atch_file_sn=? WHERE pst_sn=?", author, author, attachment, post);
        var before = jdbc.queryForMap("SELECT * FROM tb_bbs_item WHERE pst_sn=?", post);
        var expectedRow = new java.util.concurrent.atomic.AtomicReference<>(before);
        int version = ((Number) before.get("version")).intValue();
        var request = new BoardSaveRequest(bbsId, "with appended file", "new body", null, null, null,
                null, null, null, "N", "Y", null, version);
        var appendedPath = new java.util.concurrent.atomic.AtomicReference<java.nio.file.Path>();
        String application = "board-multipart-" + author;
        try (var blocker = dataSource.getConnection(); var executor = Executors.newSingleThreadExecutor()) {
            blocker.setAutoCommit(false);
            int blockerPid;
            try (var query = blocker.createStatement(); var row = query.executeQuery("SELECT pg_backend_pid()")) {
                row.next(); blockerPid = row.getInt(1);
            }
            try (var lock = blocker.prepareStatement("SELECT atch_file_sn FROM tb_file_master WHERE atch_file_sn=? FOR UPDATE")) {
                lock.setLong(1, attachment); lock.executeQuery().close();
            }
            var writing = executor.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(authentication);
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        try {
                            boardService.updatePostWithFiles(bbsId, post, request,
                                    List.of(new MockMultipartFile("files", "appended.txt", "text/plain", "appended".getBytes(java.nio.charset.StandardCharsets.UTF_8))));
                        } catch (java.io.IOException failure) { throw new java.io.UncheckedIOException(failure); }
                        // Capture the new physical object before flushing the later Board @Version update.
                        try (var stored = java.nio.file.Files.list(directory)) {
                            appendedPath.set(stored.filter(path -> !path.getFileName().toString().equals(initial.getStrgFileNm()))
                                    .findFirst().orElseThrow());
                        } catch (java.io.IOException failure) { throw new java.io.UncheckedIOException(failure); }
                        assertThat(appendedPath.get()).hasContent("appended");
                        fileDetails.flush();
                        if (outcome.equals("rollback")) status.setRollbackOnly();
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                boolean waiting;
                do {
                    waiting = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM pg_stat_activity "
                            + "WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock' "
                            + "AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_file_master%')",
                            Boolean.class, application, blockerPid));
                    if (!waiting && writing.isDone()) writing.get();
                    if (!waiting) Thread.sleep(20);
                } while (!waiting && System.nanoTime() < deadline);
                assertThat(waiting).as("actual BoardService multipart append waits before adding file metadata").isTrue();
                assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_file_detail WHERE atch_file_sn=?", Long.class, attachment)).isEqualTo(1);
                if (outcome.equals("optimistic-conflict")) {
                    jdbc.update("UPDATE tb_bbs_item SET version=version+1, pst_ttl='concurrent title' WHERE pst_sn=?", post);
                    expectedRow.set(jdbc.queryForMap("SELECT * FROM tb_bbs_item WHERE pst_sn=?", post));
                }
            } finally { blocker.rollback(); }
            if (outcome.equals("optimistic-conflict")) {
                assertThatThrownBy(() -> writing.get(20, TimeUnit.SECONDS))
                        .hasCauseInstanceOf(org.springframework.orm.ObjectOptimisticLockingFailureException.class);
            } else {
                writing.get(20, TimeUnit.SECONDS);
            }
        }
        assertThat(storageRoot.resolve(initial.getFileStrgPath()).resolve(initial.getStrgFileNm())).hasContent("initial");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_file_detail WHERE atch_file_sn=?", Long.class, attachment))
                .isEqualTo(rollback ? 1 : 2);
        if (rollback) {
            assertThat(jdbc.queryForMap("SELECT * FROM tb_bbs_item WHERE pst_sn=?", post)).isEqualTo(expectedRow.get());
            assertThat(appendedPath.get()).doesNotExist();
        } else {
            assertThat(jdbc.queryForMap("SELECT pst_ttl, pst_cn, version, atch_file_sn FROM tb_bbs_item WHERE pst_sn=?", post))
                    .containsEntry("pst_ttl", "with appended file").containsEntry("pst_cn", "new body")
                    .containsEntry("version", version + 1).containsEntry("atch_file_sn", attachment);
            assertThat(appendedPath.get()).hasContent("appended");
        }
    }

    private RuntimeException attempt(Runnable action) {
        return attempt(List.of("BOARD_PIN"), action);
    }

    private RuntimeException attempt(List<String> permissions, Runnable action) {
        var principal = CustomUserDetails.builder().userId(author).esntlId(author).enabled(true).lockAt("N")
                .groups(List.of()).permissions(permissions).authorizationVersion("board-operations-fixture").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        try {
            action.run();
            return null;
        } catch (RuntimeException failure) {
            return failure;
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(20, TimeUnit.SECONDS)) throw new IllegalStateException("선행 고정의 커밋 허용이 오지 않았다");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    private record Wait(int pid, String statement, List<Integer> blockers) {
    }

    private long pstSn(String title) {
        return jdbc.queryForObject("SELECT pst_sn FROM tb_bbs_item WHERE bbs_id = ? AND pst_ttl = ?", Long.class, bbsId, title);
    }

    private void pin(String title, String yn, String endYmd) {
        jdbc.update("UPDATE tb_bbs_item SET upend_fix_yn = ?, upend_fix_end_ymd = ? WHERE bbs_id = ? AND pst_ttl = ?",
                yn, endYmd, bbsId, title);
    }

    private void post(String title, long sortOrdr, LocalDateTime createdAt, String startYmd, String endYmd,
            String userId, int views) {
        jdbc.update("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, pst_cn, use_yn, scrt_yn, sort_ordr, ans_sn, crt_dt,"
                        + " pst_bgng_ymd, pst_end_ymd, user_id, inq_cnt, cmnt_cnt) VALUES (?, ?, 'body', 'Y', 'N', ?, 1, ?, ?, ?, ?, ?, 0)",
                bbsId, title, sortOrdr, createdAt == null ? null : Timestamp.valueOf(createdAt), startYmd, endYmd, userId, views);
    }

    private BoardSearchCondition readAll(String orderBy) {
        BoardSearchCondition condition = new BoardSearchCondition(bbsId);
        condition.setUseYn("Y");
        condition.setSecretPostAdminOverride(true);
        condition.setBaseYmd(TODAY);
        condition.setOrderBy(orderBy);
        return condition;
    }

    private BoardSearchCondition visible(String viewer) {
        BoardSearchCondition condition = new BoardSearchCondition(bbsId);
        condition.setUseYn("Y");
        condition.setViewerEsntlId(viewer);
        condition.setPostingOpenOn(TODAY);
        condition.setBaseYmd(TODAY);
        return condition;
    }

    private BoardSearchCondition withStatus(PostingStatus status) {
        BoardSearchCondition condition = readAll(null);
        condition.setPostingStatus(status);
        return condition;
    }

    @Test
    @DisplayName("게시·이용 일별 집계는 PostgreSQL 에서 일자 문자열과 건수를 돌려주고 끝 경계를 세지 않는다")
    void dailyStatisticsCountHalfOpenRanges() {
        jdbc.update("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, crt_dt) VALUES (?, 'a', 'Y', TIMESTAMP '2031-03-05 23:59:59')", bbsId);
        jdbc.update("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, crt_dt) VALUES (?, 'b', 'N', TIMESTAMP '2031-03-05 12:00:00')", bbsId);
        jdbc.update("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, crt_dt) VALUES (?, 'c', 'Y', TIMESTAMP '2031-03-06 00:00:00')", bbsId);
        jdbc.update("INSERT INTO tb_dta_use_stats (bbs_id, file_sn, crt_dt) VALUES (?, 1, TIMESTAMP '2031-03-05 01:00:00')", bbsId);

        assertSingleDay(boards.countPostsByDate("2031-03-05 00:00:00", "2031-03-06 00:00:00"));
        assertThat(boards.countPostsBetween("2031-03-05 00:00:00", "2031-03-06 00:00:00")).isEqualTo(1);
        assertSingleDay(usage.countByDate("2031-03-05 00:00:00", "2031-03-06 00:00:00"));
    }

    @Test
    @DisplayName("상단 고정은 종료일이 있든 없든 형 오류 없이 쓴다")
    void pinWritesBothBranches() {
        Long post = jdbc.queryForObject("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn) VALUES (?, '고정', 'Y') RETURNING pst_sn", Long.class, bbsId);

        assertThat(boards.updatePin(bbsId, List.of(post), "Y", "20311231")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT upend_fix_end_ymd FROM tb_bbs_item WHERE pst_sn = ?", String.class, post)).isEqualTo("20311231");
        assertThat(boards.updatePin(bbsId, List.of(post), "N", null)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT upend_fix_end_ymd FROM tb_bbs_item WHERE pst_sn = ?", String.class, post)).isNull();
    }

    private static void assertSingleDay(List<Object[]> rows) {
        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst()[0]).isEqualTo("2031-03-05");
        assertThat(((Number) rows.getFirst()[1]).longValue()).isEqualTo(1);
    }

    private List<String> titles(BoardSearchCondition condition) {
        return inTransaction(() -> boards.searchArticles(condition, PageRequest.of(0, 20)).getContent().stream()
                .map(BoardSearchResult::getPstTtl).toList());
    }

    private <T> T inTransaction(Supplier<T> work) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setReadOnly(true);
        return template.execute(status -> work.get());
    }
}
