package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.service.informalsanction.ApprovalSavedLineService;
import nuri.business.service.informalsanction.dto.ApprovalSavedLineRequest;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * 나의 결재선(DEC-OPS-328)의 1인 20개 상한과 이름 중복 거부를 실제 PostgreSQL 경합으로 확인한다.
 *
 * <p>순서를 운에 맡기지 않는다. 선행 저장이 사용자 행 잠금을 쥔 채 커밋을 미루고, 후행 저장들이 같은 사용자 행 잠금을 실제로
 * 기다리는 것을 {@code pg_stat_activity} 로 확인한 뒤에야 선행을 커밋시킨다. 후행은 잠금을 얻은 뒤 선행이 커밋한 행을 세므로
 * 20번째 다음 저장은 C014, 같은 이름은 C008 이어야 한다. 거부 예외는 앱의 실제 예외 처리기를 지나 500 이 아닌 409 가 되는지도 본다.
 *
 * <p>개수를 잠금 전에 세거나 잠금을 걷으면 후행이 선행의 커밋 전 상태(19개·이름 없음)를 보고 저장해 결과 단언이 깨진다.
 */
@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class ApprovalSavedLineConcurrencyIntegrationTest {
    @Autowired private ApprovalSavedLineService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private GlobalExceptionHandler exceptionHandler;
    @PersistenceContext private EntityManager entityManager;

    private String owner;
    private String approver;
    private String group;
    private String application;

    @BeforeEach
    void seedDisposableFixtures() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        owner = "SLO" + suffix;
        approver = "SLA" + suffix;
        group = "SLG" + suffix;
        application = "saved-line-" + suffix;
        user(owner);
        user(approver);
        // 결재자 자격(사용 중·결재 권한)은 서비스가 실제 그룹 배정에서 읽는다 — 저장이 자격 검사에서 막히지 않게 둔다.
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'saved line fixture',to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group);
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'OPERATION','APPROVAL_APPROVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group);
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", approver, group);
        authenticate();
    }

    @AfterEach
    void cleanDisposableFixtures() {
        SecurityContextHolder.clearContext();
        // 결재선 상세는 FK(ON DELETE CASCADE)가 함께 지운다.
        jdbc.update("DELETE FROM tb_ifml_atrz_indv_apln WHERE user_id=?", owner);
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=?", approver);
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=?", group);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd=?", group);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?,?)", owner, approver);
    }

    @Test
    void simultaneousCreatesAtNineteenLinesStopAtTwenty() throws Exception {
        for (int index = 1; index <= 19; index++) {
            jdbc.update("INSERT INTO tb_ifml_atrz_indv_apln(user_id,apln_nm,crt_dt,mdfcn_dt) "
                    + "VALUES(?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", owner, "기존 결재선 " + index);
        }

        Race race = race(List.of("새 결재선 A", "새 결재선 B", "새 결재선 C"));

        assertThat(race.outcomes()).as("19개에서 동시에 3건을 저장하면 정확히 1건만 저장되고 나머지는 상한(C014)으로 거부된다")
                .containsExactly("saved", "C014", "C014");
        for (Throwable rejected : race.rejections()) {
            assertRejectedWithoutServerError(rejected, CommonErrorCode.RESOURCE_IN_USE,
                    "나의 결재선은 20개까지 저장할 수 있습니다. 쓰지 않는 결재선을 지워 주세요.");
        }
        assertThat(lineCount()).as("동시 저장 뒤에도 결재선은 20개를 넘지 않는다").isEqualTo(20);
        assertThat(approverRowCount()).as("거부된 저장의 결재자 행은 남지 않는다").isEqualTo(1);
        race.assertContendersQueuedOnOwnerRow();
    }

    @Test
    void simultaneousCreatesWithTheSameNameKeepOneLine() throws Exception {
        Race race = race(List.of("자주 쓰는 결재선", "자주 쓰는 결재선"));

        assertThat(race.outcomes()).as("같은 이름으로 동시에 저장하면 1건만 저장되고 다른 1건은 이름 중복(C008)으로 거부된다")
                .containsExactly("saved", "C008");
        assertRejectedWithoutServerError(race.rejections().getFirst(), CommonErrorCode.DUPLICATE_RESOURCE,
                "같은 이름의 결재선이 있습니다. 다른 이름을 쓰거나 그 결재선을 지금 결재선으로 바꿔 주세요.");
        assertThat(jdbc.queryForList("SELECT apln_nm FROM tb_ifml_atrz_indv_apln WHERE user_id=?", String.class, owner))
                .as("같은 이름의 결재선은 하나만 남는다").containsExactly("자주 쓰는 결재선");
        assertThat(approverRowCount()).as("거부된 저장의 결재자 행은 남지 않는다").isEqualTo(1);
        race.assertContendersQueuedOnOwnerRow();
    }

    /**
     * 첫 이름은 선행 저장이다 — 저장한 뒤 커밋하지 않고 기다린다. 나머지는 그 뒤에 시작해 같은 사용자 행 잠금을 기다리는 것이
     * 확인된 뒤에야 선행이 커밋한다. 결과는 이름 순서대로 저장 성공({@code saved}), 오류 코드, 또는 예상 밖 예외 이름이다.
     */
    private Race race(List<String> names) throws Exception {
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var leadingPid = new AtomicInteger();
        List<Future<Attempt>> attempts = new ArrayList<>();
        Map<Integer, Wait> waits;
        try (var executor = Executors.newFixedThreadPool(names.size())) {
            try {
                attempts.add(executor.submit(() -> attempt(() -> new TransactionTemplate(transactionManager).execute(status -> {
                    leadingPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    Object saved = service.createSavedLine(owner, request(names.getFirst()));
                    entityManager.flush();
                    applied.countDown();
                    await(release);
                    return saved;
                }))));
                boolean ready = applied.await(15, TimeUnit.SECONDS);
                if (!ready && attempts.getFirst().isDone()) {
                    throw new IllegalStateException("선행 저장이 잠금을 쥐기 전에 끝났다: " + attempts.getFirst().get().label());
                }
                assertThat(ready).as("선행 저장이 사용자 행 잠금을 쥔 채 결재선을 DB 에 반영함").isTrue();
                for (int index = 1; index < names.size(); index++) {
                    String name = names.get(index);
                    String contender = application + "-" + index;
                    attempts.add(executor.submit(() -> attempt(() -> new TransactionTemplate(transactionManager).execute(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, contender);
                        // 잠금을 끝내 얻지 못해도 시험이 멈추지 않게 둔 안전장치다 — 정상 경로는 몇 초 안에 끝난다.
                        jdbc.queryForObject("SELECT set_config('lock_timeout', '30s', true)", String.class);
                        return service.createSavedLine(owner, request(name));
                    }))));
                }
                waits = awaitContendersSettled(attempts.subList(1, attempts.size()));
            } finally {
                release.countDown();
            }
            List<Attempt> results = new ArrayList<>();
            for (Future<Attempt> attempt : attempts) results.add(attempt.get(30, TimeUnit.SECONDS));
            return new Race(results, waits, leadingPid.get(), names.size() - 1);
        }
    }

    /**
     * 후행 저장마다 끝났거나 실제 DB 잠금을 기다리는 상태가 될 때까지 본다. 잠금을 기다리면 그 문장과 막은 백엔드를 남긴다.
     * 선행이 커밋하지 않으므로 잠금이 제대로 걸렸다면 후행은 여기서 끝날 수 없다.
     */
    private Map<Integer, Wait> awaitContendersSettled(List<Future<Attempt>> contenders) throws InterruptedException {
        Map<Integer, Wait> waits = new LinkedHashMap<>();
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (true) {
            jdbc.query("""
                    SELECT application_name, pid, lower(query) AS statement, pg_blocking_pids(pid) AS blockers
                    FROM pg_stat_activity
                    WHERE datname=current_database() AND wait_event_type='Lock' AND application_name LIKE ?
                    """, (RowCallbackHandler) row -> {
                int index = Integer.parseInt(row.getString("application_name").substring(application.length() + 1));
                Integer[] blockers = (Integer[]) row.getArray("blockers").getArray();
                waits.putIfAbsent(index, new Wait(row.getInt("pid"), row.getString("statement"), Set.of(blockers)));
            }, application + "-%");
            boolean settled = true;
            for (int index = 1; index <= contenders.size(); index++) {
                if (!waits.containsKey(index) && !contenders.get(index - 1).isDone()) settled = false;
            }
            if (settled) return waits;
            assertThat(System.nanoTime() < deadline)
                    .as("후행 저장이 끝나거나 DB 잠금 대기에 이르러야 한다. 관측한 대기: %s", waits).isTrue();
            Thread.sleep(20);
        }
    }

    private Attempt attempt(Supplier<Object> action) {
        authenticate();
        try {
            return new Attempt(action.get(), null);
        } catch (RuntimeException failure) {
            return new Attempt(null, failure);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    /** 거부 예외가 서비스의 판정에서 왔고, 앱의 예외 처리기를 지나면 500 이 아닌 409 와 같은 코드·문구가 되는지 본다. */
    private void assertRejectedWithoutServerError(Throwable rejected, CommonErrorCode expected, String message)
            throws Exception {
        assertThat(rejected).isInstanceOfSatisfying(BusinessException.class, failure -> {
            assertThat(failure.getErrorCode()).isEqualTo(expected);
            assertThat(failure.getMessage()).isEqualTo(message);
        });
        var mvc = MockMvcBuilders.standaloneSetup(new FailureProbeController((RuntimeException) rejected))
                .setControllerAdvice(exceptionHandler).build();
        var response = mvc.perform(post("/saved-line-failure-probe")).andReturn().getResponse();
        assertThat(response.getStatus()).as("동시 저장의 거부는 서버 오류(500)가 아니다").isEqualTo(409);
        var body = tools.jackson.databind.json.JsonMapper.builder().build()
                .readTree(response.getContentAsString(StandardCharsets.UTF_8));
        assertThat(body.path("code").asString()).isEqualTo(expected.getCode());
        assertThat(body.path("message").asString()).isEqualTo(message);
        assertThat(body.path("success").asBoolean()).isFalse();
    }

    private ApprovalSavedLineRequest request(String name) {
        return ApprovalSavedLineRequest.builder().aplnNm(name)
                .stages(List.of(new ApprovalStageRequest(ApprovalStageKind.APPROVAL, List.of(approver)))).build();
    }

    private long lineCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_indv_apln WHERE user_id=?", Long.class, owner);
    }

    private long approverRowCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_ifml_atrz_indv_apln_dtl d "
                + "JOIN tb_ifml_atrz_indv_apln l ON l.ifml_atrz_indv_apln_sn=d.ifml_atrz_indv_apln_sn WHERE l.user_id=?",
                Long.class, owner);
    }

    private void user(String esntlId) {
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'saved line fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))",
                esntlId, esntlId);
    }

    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(owner).esntlId(owner).enabled(true).lockAt("N")
                .groups(List.of()).permissions(List.of()).authorizationVersion("saved-line-fixture").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(20, TimeUnit.SECONDS)) throw new IllegalStateException("선행 저장의 커밋 허용이 오지 않았다");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    private record Attempt(Object saved, RuntimeException failure) {
        String label() {
            if (failure == null) return "saved";
            return failure instanceof BusinessException business
                    ? business.getErrorCode().getCode() : failure.getClass().getSimpleName();
        }
    }

    private record Wait(int pid, String statement, Set<Integer> blockers) {
    }

    private record Race(List<Attempt> attempts, Map<Integer, Wait> waits, int leadingPid, int contenders) {
        List<String> outcomes() {
            return attempts.stream().map(Attempt::label).toList();
        }

        List<Throwable> rejections() {
            return attempts.stream().<Throwable>map(Attempt::failure).filter(java.util.Objects::nonNull).toList();
        }

        /**
         * 후행 저장 모두가 개수·이름을 확인하기 전에 소유자의 사용자 행 잠금(SELECT ... FOR [NO KEY] UPDATE)을 기다렸고, 그 대기는
         * 선행 저장(또는 앞서 줄 선 후행)에게만 막혀 있었다 — 다른 세션의 잠금 때문에 우연히 맞은 순서가 아니다.
         */
        void assertContendersQueuedOnOwnerRow() {
            assertThat(waits.keySet()).as("후행 저장 전부가 실제 DB 잠금을 기다렸다: %s", waits).hasSize(contenders);
            Set<Integer> queue = new HashSet<>(List.of(leadingPid));
            waits.values().forEach(wait -> queue.add(wait.pid()));
            Set<Integer> blockers = new HashSet<>();
            for (Wait wait : waits.values()) {
                assertThat(wait.statement()).as("후행 저장이 기다린 문장은 소유자 사용자 행 잠금 조회다")
                        .contains("tb_user_info").containsPattern("for (no key )?update");
                blockers.addAll(wait.blockers());
            }
            assertThat(blockers).as("후행 저장을 막은 것은 선행 저장과 앞선 후행 저장뿐이다")
                    .contains(leadingPid).isSubsetOf(queue);
        }
    }

    @RestController
    @org.springframework.context.annotation.Profile("approval-saved-line-response-probe")
    static class FailureProbeController {
        private final RuntimeException failure;

        FailureProbeController(RuntimeException failure) {
            this.failure = failure;
        }

        @PostMapping("/saved-line-failure-probe")
        void fail() {
            throw failure;
        }
    }
}
