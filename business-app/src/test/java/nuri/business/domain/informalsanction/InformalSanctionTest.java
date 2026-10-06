package nuri.business.domain.informalsanction;



import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("InformalSanction 엔티티 테스트")
class InformalSanctionTest {

    @Test
    @DisplayName("InformalSanction 빌더 및 초기화 테스트")
    void builderTest() {
        InformalSanction sanction = InformalSanction.builder()
                .ifmlAtrzSn(1L)
                .taskSeCd("001")
                .aplcntId("user01")
                .reqYmd("20240101")
                .aprvrId("admin")
                .build();

        assertThat(sanction.getIfmlAtrzSn()).isEqualTo(1L);
        assertThat(sanction.getTaskSeCd()).isEqualTo("001");
        assertThat(sanction.getAplcntId()).isEqualTo("user01");
        assertThat(sanction.getAprvYn()).isNull();
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

    @Test
    void resubmitPreservesCompatibleDateInput() {
        for (String value : new String[] {null, "", "20000229", "2000-02-29"}) {
            InformalSanction rejected = InformalSanction.builder().aprvYn(SanctionStatus.REJECTED.getCode()).build();
            rejected.resubmit("TASK", value, "Title", "Body", "approver");
            assertThat(rejected.getReqYmd()).isEqualTo(value);
        }
    }

    @Test
    void invalidDateCannotStartANewRevision() {
        for (String value : new String[] {"20260229", "1900-02-29", "2026-04-31", "00000101", "0000-01-01",
                "2026--09-10", "202-609-10", "20260910-", " ", " 20260910"}) {
            InformalSanction rejected = InformalSanction.builder().aprvYn(SanctionStatus.REJECTED.getCode())
                    .reqYmd("20260901").docCn("Original").build();
            assertThatThrownBy(() -> rejected.resubmit("NEW", value, "Title", "Replacement", "second"))
                    .as(value).isInstanceOf(BusinessException.class);
            assertThat(rejected.getReqYmd()).isEqualTo("20260901");
            assertThat(rejected.getDocCn()).isEqualTo("Original");
            assertThat(rejected.getAtrzCycl()).isEqualByComparingTo("1");
            assertThat(rejected.getAprvYn()).isEqualTo(SanctionStatus.REJECTED.getCode());
        }
    }
}
