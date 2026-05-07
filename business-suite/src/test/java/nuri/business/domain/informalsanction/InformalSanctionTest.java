package nuri.business.domain.informalsanction;

import nuri.business.domain.informalsanction.SanctionStatus;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("InformalSanction 엔티티 테스트")
class InformalSanctionTest {

    @Test
    @DisplayName("InformalSanction 빌더 및 초기화 테스트")
    void builderTest() {
        InformalSanction sanction = InformalSanction.builder()
                .informalSanctionId("IS_001")
                .jobSeCode("001")
                .applicantId("user01")
                .requestDe("20240101")
                .sanctionerId("admin")
                .build();

        assertThat(sanction.getInformalSanctionId()).isEqualTo("IS_001");
        assertThat(sanction.getJobSeCode()).isEqualTo("001");
        assertThat(sanction.getApplicantId()).isEqualTo("user01");
        assertThat(sanction.getConfmAt()).isNull();
    }

    @Test
    @DisplayName("InformalSanction 수정 테스트")
    void updateTest() {
        InformalSanction sanction = InformalSanction.builder()
                .jobSeCode("001")
                .confmAt(SanctionStatus.REQUESTED.getCode())
                .build();

        sanction.update("002", "20240201", "admin2");

        assertThat(sanction.getJobSeCode()).isEqualTo("002");
        assertThat(sanction.getRequestDe()).isEqualTo("20240201");
        assertThat(sanction.getSanctionerId()).isEqualTo("admin2");
    }

    @Test
    @DisplayName("InformalSanction 승인 및 반려 테스트")
    void sanctionActionTest() {
        // given
        InformalSanction sanction = InformalSanction.builder()
                .confmAt(SanctionStatus.REQUESTED.getCode())
                .build();

        // when (approve)
        sanction.approve();
        assertThat(sanction.getConfmAt()).isEqualTo(SanctionStatus.APPROVED.getCode());
        assertThat(sanction.getSanctionDt()).isNotNull();

        // given (reset for reject test)
        InformalSanction sanction2 = InformalSanction.builder()
                .confmAt(SanctionStatus.REQUESTED.getCode())
                .build();

        // when (reject)
        sanction2.reject("Invalid request");
        assertThat(sanction2.getConfmAt()).isEqualTo(SanctionStatus.REJECTED.getCode());
        assertThat(sanction2.getReturnResn()).isEqualTo("Invalid request");
    }
}
