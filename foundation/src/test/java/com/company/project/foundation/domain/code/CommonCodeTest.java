package com.company.project.foundation.domain.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CommonCode ?îÌã∞???åÏä§??)
class CommonCodeTest {

    @Test
    @DisplayName("CommonCode ?îÌã∞??ÎπåÎçî Î∞?Ï¥àÍ∏∞???åÏä§??)
    void builderTest() {
        CommonCode commonCode = CommonCode.builder()
                .codeGroupId("COM001")
                .code("C01")
                .codeNm("Code Name")
                .codeDc("Code Description")
                .frstRegisterId("admin")
                .build();

        assertThat(commonCode.getCodeGroupId()).isEqualTo("COM001");
        assertThat(commonCode.getCode()).isEqualTo("C01");
        assertThat(commonCode.getCodeNm()).isEqualTo("Code Name");
        assertThat(commonCode.getUseAt()).isEqualTo("Y");
        assertThat(commonCode.getFrstRegisterId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("CommonCode ?îÌã∞???òÏ†ï ?åÏä§??)
    void updateTest() {
        CommonCode commonCode = CommonCode.builder()
                .codeGroupId("COM001")
                .code("C01")
                .codeNm("Old Name")
                .build();

        commonCode.update("New Name", "New Description", "N", "staff");

        assertThat(commonCode.getCodeNm()).isEqualTo("New Name");
        assertThat(commonCode.getCodeDc()).isEqualTo("New Description");
        assertThat(commonCode.getUseAt()).isEqualTo("N");
        assertThat(commonCode.getLastUpdusrId()).isEqualTo("staff");
    }

    @Test
    @DisplayName("CommonCode ?îÌã∞????†ú ?åÏä§??)
    void deleteTest() {
        CommonCode commonCode = CommonCode.builder()
                .codeGroupId("COM001")
                .code("C01")
                .codeNm("Code Name") // Fixed: provide required field
                .useAt("Y")
                .build();

        commonCode.delete();

        assertThat(commonCode.getUseAt()).isEqualTo("N");
    }
}
