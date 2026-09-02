package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AuditEvent 단위 테스트")
class AuditEventTest {

    private static AuditEvent event(int statusCode, String esntlId) {
        return new AuditEvent(
                "/api/v1/users", "GET", statusCode, "user-1", esntlId, "127.0.0.1", 42L,
                LocalDateTime.of(2026, 8, 12, 16, 30), "UserApiController", "getUser");
    }

    @Test
    @DisplayName("감사 이벤트가 요청 문맥을 손실 없이 보존한다")
    void preservesAuditContext() {
        LocalDateTime occurredAt = LocalDateTime.of(2026, 8, 12, 16, 30);

        AuditEvent event = event(200, "USRCNFRM_0001");

        assertThat(event.url()).isEqualTo("/api/v1/users");
        assertThat(event.httpMethod()).isEqualTo("GET");
        assertThat(event.statusCode()).isEqualTo(200);
        assertThat(event.userId()).isEqualTo("user-1");
        assertThat(event.esntlId()).isEqualTo("USRCNFRM_0001");
        assertThat(event.clientIp()).isEqualTo("127.0.0.1");
        assertThat(event.durationMs()).isEqualTo(42L);
        assertThat(event.occurredAt()).isEqualTo(occurredAt);
        assertThat(event.serviceName()).isEqualTo("UserApiController");
        assertThat(event.methodName()).isEqualTo("getUser");
    }

    /**
     * 실패 경계는 시스템 오류 로그({@code tb_sys_log}) 적재 조건이다. 경계를 잘못 잡으면
     * 정상 응답이 오류 로그를 오염시키거나(3xx 포함), 실제 4xx 가 기록에서 빠진다.
     */
    @ParameterizedTest(name = "status {0} → 실패 여부 {1}")
    @CsvSource({
            "200, false",
            "201, false",
            "304, false",
            "399, false",
            "400, true",
            "403, true",
            "404, true",
            "500, true",
            "503, true"
    })
    @DisplayName("4xx 이상만 실패로 판정한다")
    void classifiesFailureByStatusBoundary(int statusCode, boolean expectedFailure) {
        assertThat(event(statusCode, "USRCNFRM_0001").isFailure()).isEqualTo(expectedFailure);
    }

    /**
     * {@code tb_user_log.dmnd_user_id} 에는 {@code tb_user_info(esntl_id)} FK 가 걸려 있다.
     * 빈 문자열을 "식별됨" 으로 보면 집계 UPSERT 가 제약 위반으로 전량 실패하므로 공백도 배제한다.
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t"})
    @DisplayName("esntlId 가 없거나 공백이면 식별된 사용자가 아니다")
    void treatsBlankEsntlIdAsUnidentified(String esntlId) {
        assertThat(event(200, esntlId).hasIdentifiedUser()).isFalse();
    }

    @Test
    @DisplayName("esntlId 가 있으면 식별된 사용자다")
    void treatsPresentEsntlIdAsIdentified() {
        assertThat(event(200, "USRCNFRM_0001").hasIdentifiedUser()).isTrue();
    }
}
