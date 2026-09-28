package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.RecordComponent;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserCredentialsChangedEvent 모듈 간 인증 폐기 계약")
class UserCredentialsChangedEventTest {
    @Test
    @DisplayName("도전 폐기 대상의 내부 식별자만 전달하고 비밀번호·인증정보를 싣지 않는다")
    void carriesOnlyTheSubjectKeyAcrossModuleBoundary() {
        UserCredentialsChangedEvent event = new UserCredentialsChangedEvent("SUBJECT_42");

        assertThat(event).isInstanceOf(DomainEvent.class);
        assertThat(event.esntlId()).isEqualTo("SUBJECT_42");
        // A loginId or credential payload must not silently join this cross-layer event contract.
        assertThat(UserCredentialsChangedEvent.class.getRecordComponents())
                .extracting(RecordComponent::getName).containsExactly("esntlId");
        assertThat(UserCredentialsChangedEvent.class.getRecordComponents())
                .extracting(RecordComponent::getType).containsExactly(String.class);
    }
}
