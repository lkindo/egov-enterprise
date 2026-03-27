package com.company.project.foundation.domain.isg;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("InternetSvcGuidance 도메인 단위 테스트")
class InternetSvcGuidanceTest {

    @Test
    @DisplayName("InternetSvcGuidance 생성 및 수정 테스트")
    void internetSvcGuidanceTest() {
        // given
        InternetSvcGuidance guidance = InternetSvcGuidance.builder()
                .intnetSvcId("ISG-001")
                .intnetSvcNm("인터넷 서비스 가이드")
                .intnetSvcDc("설명입니다")
                .reflctAt("Y")
                .build();

        // when & then
        assertThat(guidance.getIntnetSvcId()).isEqualTo("ISG-001");
        assertThat(guidance.getIntnetSvcNm()).isEqualTo("인터넷 서비스 가이드");
        assertThat(guidance.getIntnetSvcDc()).isEqualTo("설명입니다");
        assertThat(guidance.getReflctAt()).isEqualTo("Y");

        // when
        guidance.update("인터넷 서비스 가이드 수정", "수정된 설명입니다", "N");

        // then
        assertThat(guidance.getIntnetSvcNm()).isEqualTo("인터넷 서비스 가이드 수정");
        assertThat(guidance.getIntnetSvcDc()).isEqualTo("수정된 설명입니다");
        assertThat(guidance.getReflctAt()).isEqualTo("N");
    }
}
