package nuri.business.domain.informalsanction;



import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("InformalSanction 엔티티 테스트")
class InformalSanctionTest {

    @Test
    @DisplayName("InformalSanction 빌더 및 초기화 테스트")
    void builderTest() {
        InformalSanction sanction = InformalSanction.builder()
                .ifmlAtrzId("IS_001")
                .taskSeCd("001")
                .aplcntId("user01")
                .reqYmd("20240101")
                .aprvrId("admin")
                .build();

        assertThat(sanction.getIfmlAtrzId()).isEqualTo("IS_001");
        assertThat(sanction.getTaskSeCd()).isEqualTo("001");
        assertThat(sanction.getAplcntId()).isEqualTo("user01");
        assertThat(sanction.getAprvYn()).isNull();
    }

    @Test
    @DisplayName("InformalSanction 수정 테스트")
    void updateTest() {
        InformalSanction sanction = InformalSanction.builder()
                .taskSeCd("001")
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();

        sanction.update("002", "20240201", "admin2");

        assertThat(sanction.getTaskSeCd()).isEqualTo("002");
        assertThat(sanction.getReqYmd()).isEqualTo("20240201");
        assertThat(sanction.getAprvrId()).isEqualTo("admin2");
    }

    @Test
    @DisplayName("InformalSanction 승인 및 반려 테스트")
    void sanctionActionTest() {
        // given
        InformalSanction sanction = InformalSanction.builder()
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();

        // when (approve)
        sanction.approve();
        assertThat(sanction.getAprvYn()).isEqualTo(SanctionStatus.APPROVED.getCode());
        assertThat(sanction.getAtrzDt()).isNotNull();

        // given (reset for reject test)
        InformalSanction sanction2 = InformalSanction.builder()
                .aprvYn(SanctionStatus.REQUESTED.getCode())
                .build();

        // when (reject)
        sanction2.reject("Invalid request");
        assertThat(sanction2.getAprvYn()).isEqualTo(SanctionStatus.REJECTED.getCode());
        assertThat(sanction2.getRjctRsnCn()).isEqualTo("Invalid request");
    }
}
