package nuri.api.schema;

import nuri.business.service.event.EventInfoService;
import nuri.business.service.event.dto.EventInfoDto;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 남긴 행사 승인 컬럼을 앱이 쓰지 않는다는 것과 동시 정정의 대기 경계를 실제 PostgreSQL로 확인한다.
 *
 * <p>[2026-10-19] 행사 승인 처리 흐름이 제품에 없어 승인 여부·승인일을 API 에서 걷었다(물리 컬럼은 유지).
 * 종전에는 새 행사를 대기('N')로 적고 편집 요청의 승인 값 변경을 400 으로 막았다. 이제 엔티티 매핑이 읽기
 * 전용이라 등록은 그 컬럼을 비워 두고, 수정의 재빌드-merge 는 DB 에 있는 값을 덮지 않는다.
 */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class EventApprovalIntegrityIntegrationTest {
    @Autowired private EventInfoService events;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;

    private String key;
    private Long event;

    @BeforeEach
    void authenticateOwnFixture() {
        key = "BP" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(java.util.Locale.ROOT);
        authenticate("EVENT_CREATE");
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        if (event != null) jdbc.update("DELETE FROM tb_event_info WHERE evnt_sn=?", event);

    }

    @Test
    void eventEditsNeverWriteTheRetainedApprovalColumns() {
        event = events.createEvent(key, EventInfoDto.builder().evntNm(key).build());
        assertThat(approvalColumns(event)).containsExactly(null, null);
        jdbc.update("UPDATE tb_event_info SET evnt_aprv_yn='Y',evnt_aprv_ymd='20260901' WHERE evnt_sn=?", event);
        authenticate("EVENT_UPDATE");
        events.updateEvent(event, key, EventInfoDto.builder().evntNm("정정").build());
        assertThat(approvalColumns(event)).containsExactly("Y", "20260901");
        assertThat(events.getEvent(event).getEvntNm()).isEqualTo("정정");
    }

    @Test
    void eventEditWaitsAndPreservesTheCommittedApproval() throws Exception {
        event = events.createEvent(key, EventInfoDto.builder().evntNm(key).build());
        String application = "event-edit-" + key;
        try (var executor = Executors.newSingleThreadExecutor(); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var update = blocker.prepareStatement("UPDATE tb_event_info SET evnt_aprv_yn='Y',evnt_aprv_ymd='20260902' WHERE evnt_sn=?")) {
                update.setLong(1, event);
                update.executeUpdate();
            }
            var pending = executor.submit(() -> {
                authenticate("EVENT_UPDATE");
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        events.updateEvent(event, key, EventInfoDto.builder().evntNm("대기 후 정정").build());
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            try { assertWaitingOnDatabaseLock(application); }
            finally { blocker.commit(); }
            pending.get(20, TimeUnit.SECONDS);
        }
        assertThat(events.getEvent(event).getEvntNm()).isEqualTo("대기 후 정정");
        assertThat(approvalColumns(event)).containsExactly("Y", "20260902");
    }

    /** API 가 더는 내보내지 않는 남은 승인 컬럼을 DB 에서 직접 읽는다. */
    private List<String> approvalColumns(Long evntSn) {
        return jdbc.queryForObject("SELECT evnt_aprv_yn, evnt_aprv_ymd FROM tb_event_info WHERE evnt_sn=?",
                (rows, index) -> java.util.Arrays.asList(rows.getString(1), rows.getString(2)), evntSn);
    }

    private void assertWaitingOnDatabaseLock(String application) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        int waiting;
        do {
            waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
            if (waiting == 0) Thread.sleep(20);
        } while (waiting == 0 && System.nanoTime() < deadline);
        assertThat(waiting).isEqualTo(1);
    }

    private void authenticate(String permission) {
        var principal = CustomUserDetails.builder().userId(key).esntlId(key).enabled(true)
                .permissions(List.of(permission)).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
