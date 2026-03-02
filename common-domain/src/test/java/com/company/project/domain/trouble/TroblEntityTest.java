package com.company.project.domain.trouble;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TroblEntityTest {

    @Test
    @DisplayName("Trobl 엔티티 생성 및 상태 변경 테스트")
    void troubleTest() {
        Trobl trouble = Trobl.builder()
                .troblId("TRB_01")
                .troblNm("Network Issue")
                .troblKnd("01")
                .processSttus("A") // Requested
                .build();

        assertThat(trouble.getTroblId()).isEqualTo("TRB_01");
        assertThat(trouble.getProcessSttus()).isEqualTo("A");
    }
}
