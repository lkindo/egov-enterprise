package nuri.business.service.informalsanction.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("결재 기능의 공통코드 사용처")
class ApprovalCommonCodeUsageContributorTest {

    @Test
    @DisplayName("결재 업무 구분(COM075) 하나를 말하고, 사용 안 함이 상신을 막는다는 영향을 말한다")
    void statesApprovalTaskTypeUsage() {
        assertThat(new ApprovalCommonCodeUsageContributor().commonCodeUsages())
                .singleElement()
                .satisfies(usage -> {
                    assertThat(usage.groupId()).isEqualTo("COM075");
                    assertThat(usage.description()).contains("상신 검증").contains("새로 상신할 수 없고");
                });
    }
}
