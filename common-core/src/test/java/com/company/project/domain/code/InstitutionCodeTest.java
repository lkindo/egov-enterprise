package com.company.project.domain.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("InstitutionCode 엔티티 테스트")
class InstitutionCodeTest {

    @Test
    @DisplayName("InstitutionCode 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        InstitutionCode code = InstitutionCode.builder()
                .insttCode("INST01")
                .allInsttNm("Full Name")
                .lowestInsttNm("Lowest Name")
                .createdBy("admin")
                .build();

        assertThat(code.getInsttCode()).isEqualTo("INST01");
        assertThat(code.getAllInsttNm()).isEqualTo("Full Name");
        assertThat(code.getLowestInsttNm()).isEqualTo("Lowest Name");
        assertThat(code.getAblEnnc()).isEqualTo("0");
        assertThat(code.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("InstitutionCode 엔티티 수정 테스트")
    void updateTest() {
        InstitutionCode code = InstitutionCode.builder()
                .insttCode("INST01")
                .allInsttNm("Old Name")
                .build();

        code.update("New Name", "New Lowest", "Abrv", "01", "001", "01", "BEST", "UPPER", "REPR",
                "L", "M", "S", "02-123-4567", "02-123-4568", "20240101", "20241231", "0",
                "20240102", "120000", "20240101", 1, "staff");

        assertThat(code.getAllInsttNm()).isEqualTo("New Name");
        assertThat(code.getLowestInsttNm()).isEqualTo("New Lowest");
        assertThat(code.getLastModifiedBy()).isEqualTo("staff");
        assertThat(code.getSortOrdr()).isEqualTo(1);
    }

    @Test
    @DisplayName("InstitutionCode 엔티티 소프트 삭제 테스트")
    void softDeleteTest() {
        InstitutionCode code = InstitutionCode.builder()
                .insttCode("INST01")
                .ablEnnc("0")
                .build();

        code.softDelete("20241231", "20240102", "120000");

        assertThat(code.getAblEnnc()).isEqualTo("1");
        assertThat(code.getAblDe()).isEqualTo("20241231");
    }
}
