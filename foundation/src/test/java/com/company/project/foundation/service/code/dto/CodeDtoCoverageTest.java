package com.company.project.foundation.service.code.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("공통 코드 DTO 커버리�? ?�스??)
class CodeDtoCoverageTest {

    @Test
    @DisplayName("CmmnClCodeDto 커버리�?")
    void cmmnClCodeDto_Coverage() {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClCode("C1");
        dto.setClCodeNm("N1");
        dto.setClCodeDc("D1");
        dto.setUseAt("Y");
        dto.setFrstRegisterId("U1");
        dto.setLastUpdusrId("U2");

        assertThat(dto.getClCode()).isEqualTo("C1");
        assertThat(dto.getClCodeNm()).isEqualTo("N1");
        assertThat(dto.getClCodeDc()).isEqualTo("D1");
        assertThat(dto.getUseAt()).isEqualTo("Y");
        assertThat(dto.getFrstRegisterId()).isEqualTo("U1");
        assertThat(dto.getLastUpdusrId()).isEqualTo("U2");
    }

    @Test
    @DisplayName("CmmnCodeDto 커버리�?")
    void cmmnCodeDto_Coverage() {
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setClCode("C1");
        dto.setClCodeNm("N1");
        dto.setCodeId("G1");
        dto.setCodeIdNm("GN1");
        dto.setCodeIdDc("GD1");
        dto.setUseAt("Y");
        dto.setFrstRegisterId("U1");
        dto.setLastUpdusrId("U2");

        assertThat(dto.getClCode()).isEqualTo("C1");
        assertThat(dto.getCodeId()).isEqualTo("G1");
        assertThat(dto.getUseAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("CmmnDetailCodeDto 커버리�?")
    void cmmnDetailCodeDto_Coverage() {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCodeId("G1");
        dto.setCodeIdNm("GN1");
        dto.setCode("C1");
        dto.setCodeNm("CN1");
        dto.setCodeDc("CD1");
        dto.setUseAt("Y");
        dto.setFrstRegisterId("U1");
        dto.setLastUpdusrId("U2");

        assertThat(dto.getCodeId()).isEqualTo("G1");
        assertThat(dto.getCode()).isEqualTo("C1");
        assertThat(dto.getCodeNm()).isEqualTo("CN1");
    }

    @Test
    @DisplayName("AdministCodeDto 커버리�?")
    void administCodeDto_Coverage() {
        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneCode("110")
                .administZoneNm("Seoul")
                .useAt("Y")
                .build();

        assertThat(dto.getAdministZoneCode()).isEqualTo("110");
        assertThat(dto.getAdministZoneNm()).isEqualTo("Seoul");
        assertThat(dto.getUseAt()).isEqualTo("Y");
        
        AdministCodeDto fullDto = new AdministCodeDto("1", "S", "N", "U", "Y", "C", "A", "CB", null, "MB", null);
        assertThat(fullDto.getAdministZoneCode()).isEqualTo("1");
    }
}
