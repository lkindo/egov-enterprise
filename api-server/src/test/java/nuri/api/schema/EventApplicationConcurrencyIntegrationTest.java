package nuri.api.schema;

import nuri.business.domain.event.EventInfo;
import nuri.business.domain.event.EventInfoRepository;
import nuri.business.service.event.EventApplicationService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

/**
 * 행사 참가 신청의 정원(V2_152)을 실제 DB 경합으로 확인한다 — 동시 신청이 정원을 넘지 않는다.
 *
 * <p>순서를 운에 맡기지 않는다. 선행 신청이 행사 행 잠금을 쥔 채 신청 행을 반영하고 커밋을 미루며, 후행 신청들이 같은 행사 행
 * 잠금을 실제로 기다리는 것을 세션 관측으로 확인한 뒤에야 선행을 커밋시킨다. 후행은 잠금을 얻은 뒤 선행이 커밋한 자리를 세므로
 * 정원 1명인 행사의 두 후행 신청은 모두 C014(정원 초과)여야 한다. 자리를 잠금 전에 세거나 잠금을 걷으면 후행이 선행의 커밋 전
 * 상태(0명)를 보고 신청해 결과 단언이 깨진다.
 */
@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class EventApplicationConcurrencyIntegrationTest {
    @Autowired private EventApplicationService service;
    @Autowired private EventInfoRepository events;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;

    private final List<String> applicants = new ArrayList<>();
    private String application;
    private Long evntSn;

    @BeforeEach
    void seedDisposableFixtures() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        application = "event-apply-" + suffix;
        for (String prefix : List.of("EVA", "EVB", "EVC")) {
            String esntlId = prefix + suffix;
            applicants.add(esntlId);
            jdbc.update(VendorTestSql.sql(jdbc, "INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                    + "VALUES(?,?,'event apply fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))"),
                    esntlId, esntlId);
        }
        String tomorrow = LocalDate.now(ZoneId.of("Asia/Seoul")).plusDays(1).format(DateTimeFormatter.BASIC_ISO_DATE);
        authenticate(applicants.getFirst());
        evntSn = new TransactionTemplate(transactionManager).execute(status -> events.save(EventInfo.builder()
                .evntNm("동시 신청 " + suffix).evntBgngYmd(tomorrow).evntEndYmd(tomorrow)
                .pscpNope(1).aplyDdlnYmd(tomorrow).build()).getEvntSn());
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void cleanDisposableFixtures() {
        SecurityContextHolder.clearContext();
        if (evntSn != null) {
            jdbc.update("DELETE FROM tb_evnt_aply WHERE evnt_sn=?", evntSn);
            jdbc.update("DELETE FROM tb_event_info WHERE evnt_sn=?", evntSn);
        }
        for (String applicant : applicants) jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", applicant);
    }

    @Test
    void simultaneousApplicationsDoNotExceedCapacity() throws Exception {
        Race race = race();

        assertThat(race.outcomes()).as("정원 1명인 행사에 세 사람이 동시에 신청하면 먼저 잠금을 쥔 1명만 신청되고 나머지는 정원 초과(C014)다")
                .containsExactly("saved", "C014", "C014");
        for (Throwable rejected : race.rejections()) {
            assertThat(rejected).isInstanceOfSatisfying(BusinessException.class, failure -> {
                assertThat(failure.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
                assertThat(failure.getMessage()).isEqualTo("정원이 차서 신청할 수 없습니다.");
            });
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_evnt_aply WHERE evnt_sn=?", Long.class, evntSn))
                .as("동시 신청 뒤에도 신청 행은 정원을 넘지 않는다").isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT aplcnt_id FROM tb_evnt_aply WHERE evnt_sn=?", String.class, evntSn))
                .as("자리는 선행 신청자의 것이다(신청자는 인증 주체의 esntlId)").isEqualTo(applicants.getFirst());
        race.assertContendersQueuedOnEventRow();
    }

    /**
     * 첫 신청자는 선행이다 — 신청을 반영한 뒤 커밋하지 않고 기다린다. 나머지는 그 뒤에 시작해 같은 행사 행 잠금을 기다리는 것이
     * 확인된 뒤에야 선행이 커밋한다. 결과는 신청자 순서대로 신청 성공({@code saved}), 오류 코드, 또는 예상 밖 예외 이름이다.
     */
    private Race race() throws Exception {
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var leadingPid = new AtomicInteger();
        List<Future<Attempt>> attempts = new ArrayList<>();
        Map<Integer, Wait> waits;
        try (var executor = Executors.newFixedThreadPool(applicants.size())) {
            try {
                attempts.add(executor.submit(() -> attempt(applicants.getFirst(), () -> new TransactionTemplate(transactionManager).execute(status -> {
                    leadingPid.set(VendorTestSql.sessionId(jdbc));
                    Object saved = service.apply(evntSn);
                    applied.countDown();
                    await(release);
                    return saved;
                }))));
                boolean ready = applied.await(15, TimeUnit.SECONDS);
                if (!ready && attempts.getFirst().isDone()) {
                    throw new IllegalStateException("선행 신청이 잠금을 쥐기 전에 끝났다: " + attempts.getFirst().get().label());
                }
                assertThat(ready).as("선행 신청이 행사 행 잠금을 쥔 채 신청을 DB 에 반영함").isTrue();
                for (int index = 1; index < applicants.size(); index++) {
                    String applicant = applicants.get(index);
                    String contender = application + "-" + index;
                    attempts.add(executor.submit(() -> attempt(applicant, () -> new TransactionTemplate(transactionManager).execute(status -> {
                        VendorTestSql.nameSession(jdbc, contender);
                        // 잠금을 끝내 얻지 못해도 시험이 멈추지 않게 둔 안전장치다 — 정상 경로는 몇 초 안에 끝난다.
                        VendorTestSql.boundLockWait(jdbc, "30s");
                        return service.apply(evntSn);
                    }))));
                }
                waits = awaitContendersSettled(attempts.subList(1, attempts.size()));
            } finally {
                release.countDown();
            }
            List<Attempt> results = new ArrayList<>();
            for (Future<Attempt> attempt : attempts) results.add(attempt.get(30, TimeUnit.SECONDS));
            return new Race(results, waits, leadingPid.get(), applicants.size() - 1);
        }
    }

    /** 후행 신청마다 끝났거나 실제 DB 잠금을 기다리는 상태가 될 때까지 본다. 선행이 커밋하지 않으므로 잠금이 걸렸다면 끝날 수 없다. */
    private Map<Integer, Wait> awaitContendersSettled(List<Future<Attempt>> contenders) throws InterruptedException {
        Map<Integer, Wait> waits = new LinkedHashMap<>();
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (true) {
            for (var wait : VendorTestSql.lockWaits(jdbc, application + "-%")) {
                int index = Integer.parseInt(wait.session().substring(application.length() + 1));
                waits.putIfAbsent(index, new Wait((int) wait.id(), wait.statement(),
                        wait.blockers().stream().map(Long::intValue).collect(java.util.stream.Collectors.toSet())));
            }
            boolean settled = true;
            for (int index = 1; index <= contenders.size(); index++) {
                if (!waits.containsKey(index) && !contenders.get(index - 1).isDone()) settled = false;
            }
            if (settled) return waits;
            assertThat(System.nanoTime() < deadline)
                    .as("후행 신청이 끝나거나 DB 잠금 대기에 이르러야 한다. 관측한 대기: %s", waits).isTrue();
            Thread.sleep(20);
        }
    }

    private Attempt attempt(String applicant, Supplier<Object> action) {
        authenticate(applicant);
        try {
            return new Attempt(action.get(), null);
        } catch (RuntimeException failure) {
            return new Attempt(null, failure);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static void authenticate(String esntlId) {
        var principal = CustomUserDetails.builder().userId(esntlId).esntlId(esntlId).enabled(true).lockAt("N")
                .groups(List.of()).permissions(List.of("EVENT_APPLY")).authorizationVersion("event-apply-fixture").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(20, TimeUnit.SECONDS)) throw new IllegalStateException("선행 신청의 커밋 허용이 오지 않았다");
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

        /** 후행 신청 모두가 자리를 세기 전에 행사 행 잠금을 기다렸고, 그 대기는 선행(또는 앞서 줄 선 후행)에게만 막혀 있었다. */
        void assertContendersQueuedOnEventRow() {
            assertThat(waits.keySet()).as("후행 신청 전부가 실제 DB 잠금을 기다렸다: %s", waits).hasSize(contenders);
            Set<Integer> queue = new HashSet<>(List.of(leadingPid));
            waits.values().forEach(wait -> queue.add(wait.pid()));
            Set<Integer> blockers = new HashSet<>();
            for (Wait wait : waits.values()) {
                assertThat(wait.statement()).as("후행 신청이 기다린 문장은 행사 행 잠금 조회다")
                        .contains("tb_event_info").containsPattern(VendorTestSql.lockingReadPattern());
                blockers.addAll(wait.blockers());
            }
            assertThat(blockers).as("후행 신청을 막은 것은 선행 신청과 앞선 후행 신청뿐이다")
                    .contains(leadingPid).isSubsetOf(queue);
        }
    }
}
