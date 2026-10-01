package nuri.business.service.log;

import com.querydsl.core.types.Predicate;
import nuri.business.domain.log.SensitiveAuditLog;
import nuri.business.domain.log.SensitiveAuditLogRepository;
import nuri.business.security.authorization.PermissionCodes;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

/** 감사 원장 열람(2026-10-01 결정 19). */
class SensitiveAuditQueryServiceTest {

    private final SensitiveAuditLogRepository repository = mock(SensitiveAuditLogRepository.class);
    private final SensitiveAuditQueryService service =
            new SensitiveAuditQueryService(repository, JsonMapper.builder().build());

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void signIn(String... permissions) {
        CustomUserDetails principal = CustomUserDetails.builder().userId("auditor").esntlId("AUDITOR").userNm("감사자")
                .password("x").enabled(true).lockAt("N").permissions(List.of(permissions))
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static SensitiveAuditLog row(String snapshot) {
        SensitiveAuditLog row = SensitiveAuditLog.create("req-1", "COMMITTED", "ADMIN_PASSWORD_RESET", snapshot,
                "admin", LocalDateTime.of(2026, 10, 1, 9, 0));
        ReflectionTestUtils.setField(row, "logSn", BigInteger.valueOf(7));
        return row;
    }

    @Test
    @DisplayName("ADT_LOG_READ 가 없으면 원장을 읽지 못한다 — 다른 관리 권한으로 넓어지지 않는다")
    void requiresDedicatedPermission() {
        signIn("SYS_LOG_READ", "PRIVACY_READ");
        assertThatThrownBy(() -> service.search(null, null, null, null, 0, 20)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("원장 행은 대상·접속 IP·결과 상태를 풀어 싣고, 읽지 못하는 내용은 빈 값으로 둔다")
    void projectsSnapshotFields() {
        signIn("ADT_LOG_READ");
        Page<SensitiveAuditLog> page = new PageImpl<>(List.of(
                row("{\"version\":1,\"actorEsntlId\":\"A\",\"clientIp\":\"10.0.0.1\",\"targetId\":\"USR_1\",\"description\":\"민감 작업\",\"httpStatus\":200}"),
                row("not-json")));
        given(repository.findAll(any(Predicate.class), any(Pageable.class))).willReturn(page);

        var entries = service.search("admin", "ADMIN_PASSWORD_RESET", "2026-10-01", "2026-10-01", 0, 20).getContent();

        assertThat(entries.get(0).targetId()).isEqualTo("USR_1");
        assertThat(entries.get(0).clientIp()).isEqualTo("10.0.0.1");
        assertThat(entries.get(0).httpStatus()).isEqualTo(200);
        assertThat(entries.get(0).id()).isEqualTo("7");
        assertThat(entries.get(1).targetId()).isNull();
        assertThat(entries.get(1).operation()).isEqualTo("ADMIN_PASSWORD_RESET");
    }

    @Test
    @DisplayName("기간은 시작·종료를 함께 주어야 하고 역순이면 400 이다 — 조용히 전체를 보여 주지 않는다")
    void rejectsHalfOrReversedPeriods() {
        signIn("ADT_LOG_READ");
        assertThatThrownBy(() -> service.search(null, null, "2026-10-01", null, 0, 20)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.search(null, null, "2026-10-02", "2026-10-01", 0, 20)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.search(null, null, null, null, 0, 101)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(repository);
    }
}
