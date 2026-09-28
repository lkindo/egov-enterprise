package nuri.foundation.core.audit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.RecordComponent;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SensitiveAuditPort 최소 감사 계약")
class SensitiveAuditPortContractTest {
    @Test
    @DisplayName("감사 주체의 두 식별자와 대상 좌표를 구분하고 본문·인증정보 슬롯을 두지 않는다")
    void separatesIdentityAxesWithoutCarryingSensitivePayloads() {
        SensitiveAuditPort.Context context = new SensitiveAuditPort.Context(
                "request-17", "FILE_DOWNLOAD", "operator-login", "SUBJECT_1",
                "127.0.0.1", "첨부 파일 다운로드", "attachment-42/1");

        // This is a structural minimization contract, not a claim that arbitrary String values are redacted.
        assertThat(SensitiveAuditPort.Context.class.getRecordComponents())
                .extracting(RecordComponent::getName)
                .containsExactly("requestId", "operation", "actorLoginId", "actorEsntlId",
                        "clientIp", "description", "targetId");
        assertThat(SensitiveAuditPort.Context.class.getRecordComponents())
                .extracting(RecordComponent::getType).containsOnly(String.class);
        assertThat(context.actorLoginId()).isEqualTo("operator-login");
        assertThat(context.actorEsntlId()).isEqualTo("SUBJECT_1");
        assertThat(context.targetId()).isEqualTo("attachment-42/1");
        assertThat(context.requestId()).isEqualTo("request-17");
    }

    @Test
    @DisplayName("준비·HTTP 결과·업무 커밋의 영속 상태 이름을 서로 구별한다")
    void preservesPersistedOutcomeVocabulary() {
        // The ledger persists names. PREPARED cannot imply client receipt, nor COMMITTED HTTP success.
        assertThat(SensitiveAuditPort.Outcome.values())
                .extracting(Enum::name)
                .containsExactlyInAnyOrder("ATTEMPTED", "PREPARED", "SUCCEEDED", "DENIED", "FAILED",
                        "INTERRUPTED", "NOT_MODIFIED", "COMMITTED");
    }
}
