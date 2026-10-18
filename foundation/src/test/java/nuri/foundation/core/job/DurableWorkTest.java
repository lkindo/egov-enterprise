package nuri.foundation.core.job;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("DurableWork 영속 의도 입력 계약")
class DurableWorkTest {
    private static final UUID KEY = UUID.fromString("83f52cc1-a496-4a15-a88b-fc3c0bfa45d9");

    @Test
    @DisplayName("기존 handler는 종료 알림으로 재전달되거나 참조 payload와 동시성 정책이 바뀌지 않는다")
    void legacyHandlerDefaultsPreserveDeliveryAndReferencePayloadPolicy() {
        var deliveries = new java.util.ArrayList<DurableWork>();
        DurableWorkHandler handler = new DurableWorkHandler() {
            @Override public String type() { return "FILE_DELETE"; }
            @Override public void execute(DurableWork work) { deliveries.add(work); }
        };
        DurableWork work = new DurableWork(KEY, handler.type(), "immutable-storage-reference");

        handler.execute(work);
        assertThat(deliveries).containsExactly(work);
        handler.onTerminal(work, true);
        assertThat(deliveries).containsExactly(work);
        handler.onTerminal(work, false);
        assertThat(deliveries).containsExactly(work);

        // 기존 파일 삭제·알림 handler의 참조와 처리량을 유지한다. 민감 payload 삭제와
        // 유형별 실행 상한은 이를 필요로 하는 새 handler가 명시적으로 선택해야 한다.
        assertThat(handler.discardPayloadOnCompletion()).isFalse();
        assertThat(handler.maximumConcurrentExecutions()).isEqualTo(Integer.MAX_VALUE);
    }

    @Test
    @DisplayName("재시도 식별자와 참조 payload를 정규화하거나 다시 생성하지 않는다")
    void preservesReplayKeyAndReferencePayload() {
        String payload = "{\"notificationId\":17,\"receiver\":\"SUBJECT_2\"}";
        DurableWork work = new DurableWork(KEY, "NOTIFICATION_DELIVERY", payload);

        assertThat(work).isEqualTo(new DurableWork(KEY, "NOTIFICATION_DELIVERY", payload));
        assertThat(work.key()).isEqualTo(KEY);
        assertThat(work.payload()).isEqualTo(payload);
        assertThat(work).isNotEqualTo(new DurableWork(
                UUID.fromString("834a76ea-10ec-4fe7-894b-905d2e784095"), "NOTIFICATION_DELIVERY", payload));
    }

    @Test
    @DisplayName("중복 방지 키가 없으면 저장소에 도달하기 전에 거부한다")
    void rejectsMissingKey() {
        assertThatThrownBy(() -> new DurableWork(null, "FILE_DELETE", "{}"))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("key");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "file_delete", "1DELETE", "_DELETE", "FILE-DELETE", "FILE DELETE", "FILE_DELETE\n", "파일"})
    @DisplayName("타입은 대문자 영문으로 시작하는 명시 어휘만 받는다")
    void rejectsInvalidTypeWithoutEchoingInput(String type) {
        assertThatThrownBy(() -> new DurableWork(KEY, type, "{}"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid durable work type");
    }

    @Test
    @DisplayName("타입의 최소 1자와 저장 상한 100자는 허용하고 101자는 거부한다")
    void enforcesTypeStorageBoundary() {
        assertThat(new DurableWork(KEY, "A", "").type()).isEqualTo("A");
        String longestType = "A" + "9_".repeat(49) + "Z";
        assertThat(new DurableWork(KEY, longestType, "").type()).isEqualTo(longestType);
        assertThatThrownBy(() -> new DurableWork(KEY, longestType + "Z", ""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid durable work type");
    }

    @Test
    @DisplayName("빈 참조와 4000자 참조는 보존하고 미설정 또는 상한 초과는 거부한다")
    void enforcesPayloadStorageBoundaryWithoutTruncationOrDisclosure() {
        assertThat(new DurableWork(KEY, "FILE_DELETE", "").payload()).isEmpty();
        String longestPayload = "x".repeat(4000);
        assertThat(new DurableWork(KEY, "FILE_DELETE", longestPayload).payload()).isEqualTo(longestPayload);

        assertThatThrownBy(() -> new DurableWork(KEY, "FILE_DELETE", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Durable work payload exceeds its storage contract");
        assertThatThrownBy(() -> new DurableWork(KEY, "FILE_DELETE", longestPayload + "x"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Durable work payload exceeds its storage contract");
    }
}
