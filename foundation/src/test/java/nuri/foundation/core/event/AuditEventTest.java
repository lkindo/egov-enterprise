package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AuditEvent 단위 테스트")
class AuditEventTest {

    @Test
    @DisplayName("감사 이벤트가 요청 문맥을 손실 없이 보존한다")
    void preservesAuditContext() {
        LocalDateTime occurredAt = LocalDateTime.of(2026, 8, 12, 16, 30);

        AuditEvent event = new AuditEvent(
                "/api/v1/users", "user-1", "127.0.0.1", 42L, occurredAt);

        assertThat(event.url()).isEqualTo("/api/v1/users");
        assertThat(event.userId()).isEqualTo("user-1");
        assertThat(event.clientIp()).isEqualTo("127.0.0.1");
        assertThat(event.durationMs()).isEqualTo(42L);
        assertThat(event.occurredAt()).isEqualTo(occurredAt);
    }
}
