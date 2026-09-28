package nuri.api.schema;

import nuri.business.service.operation.EventInfoService;
import nuri.business.service.operation.dto.EventInfoDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 행사 승인 동결과 동시 정정의 보존 경계를 실제 PostgreSQL로 확인한다. */
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
        authenticate();
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        if (event != null) jdbc.update("DELETE FROM tb_event_info WHERE evnt_sn=?", event);

    }

    @Test
    void eventApprovalIsFrozenAcrossCreateOmittedFieldsAndRejectedInjection() {
        event = events.createEvent(key, EventInfoDto.builder().evntNm(key).build());
        assertThat(events.getEvent(event).getEvntAprvYn()).isEqualTo("N");
        assertThat(events.getEvent(event).getEvntAprvYmd()).isNull();
        assertThatThrownBy(() -> events.createEvent(key, EventInfoDto.builder().evntNm(key).evntAprvYn("Y").build()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        jdbc.update("UPDATE tb_event_info SET evnt_aprv_yn='Y',evnt_aprv_ymd='20260901' WHERE evnt_sn=?", event);
        events.updateEvent(event, key, EventInfoDto.builder().evntNm("정정").build());
        assertThat(events.getEvent(event).getEvntAprvYn()).isEqualTo("Y");
        assertThat(events.getEvent(event).getEvntAprvYmd()).isEqualTo("20260901");
        assertThatThrownBy(() -> events.updateEvent(event, key, EventInfoDto.builder().evntNm("거부").evntAprvYn("N").build()))
                .isInstanceOf(BusinessException.class);
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
                authenticate();
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
        var saved = events.getEvent(event);
        assertThat(saved.getEvntNm()).isEqualTo("대기 후 정정");
        assertThat(saved.getEvntAprvYn()).isEqualTo("Y");
        assertThat(saved.getEvntAprvYmd()).isEqualTo("20260902");
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

    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(key).esntlId(key).enabled(true)
                .permissions(List.of()).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
