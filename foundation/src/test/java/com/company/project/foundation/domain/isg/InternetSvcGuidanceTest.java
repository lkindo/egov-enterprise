package com.company.project.foundation.domain.isg;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("InternetSvcGuidance ?„λ©”???¨μ„ ?μ¤??)
class InternetSvcGuidanceTest {

    @Test
    @DisplayName("InternetSvcGuidance ?μ„± λ°??μ • ?μ¤??)
    void internetSvcGuidanceTest() {
        // given
        InternetSvcGuidance guidance = InternetSvcGuidance.builder()
                .intnetSvcId("ISG-001")
                .intnetSvcNm("?Έν„°???λΉ„??κ°€?΄λ“")
                .intnetSvcDc("?¤λª…?…λ‹??)
                .reflctAt("Y")
                .build();

        // when & then
        assertThat(guidance.getIntnetSvcId()).isEqualTo("ISG-001");
        assertThat(guidance.getIntnetSvcNm()).isEqualTo("?Έν„°???λΉ„??κ°€?΄λ“");
        assertThat(guidance.getIntnetSvcDc()).isEqualTo("?¤λª…?…λ‹??);
        assertThat(guidance.getReflctAt()).isEqualTo("Y");

        // when
        guidance.update("?Έν„°???λΉ„??κ°€?΄λ“ ?μ •", "?μ •???¤λª…?…λ‹??, "N");

        // then
        assertThat(guidance.getIntnetSvcNm()).isEqualTo("?Έν„°???λΉ„??κ°€?΄λ“ ?μ •");
        assertThat(guidance.getIntnetSvcDc()).isEqualTo("?μ •???¤λª…?…λ‹??);
        assertThat(guidance.getReflctAt()).isEqualTo("N");
    }
}
