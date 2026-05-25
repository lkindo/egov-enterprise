package nuri.foundation.service.code.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("공통 코드 DTO 커버리지 테스트")
class CodeDtoCoverageTest {

    @Test
    @DisplayName("CmmnClCodeDto 커버리지")
    void cmmnClCodeDto_Coverage() {
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClsfCd("C1");
        dto.setClsfCdNm("N1");
        dto.setClsfCdExpln("D1");
        dto.setUseYn("Y");
        dto.setFrstRegisterId("U1");
        dto.setLastUpdusrId("U2");

        assertThat(dto.getClsfCd()).isEqualTo("C1");
        assertThat(dto.getClsfCdNm()).isEqualTo("N1");
        assertThat(dto.getClsfCdExpln()).isEqualTo("D1");
        assertThat(dto.getUseYn()).isEqualTo("Y");
        assertThat(dto.getFrstRegisterId()).isEqualTo("U1");
        assertThat(dto.getLastUpdusrId()).isEqualTo("U2");
    }

    @Test
    @DisplayName("CmmnCodeDto 커버리지")
    void cmmnCodeDto_Coverage() {
        CmmnCodeDto dto = new CmmnCodeDto();
        dto.setClsfCd("C1");
        dto.setClsfCdNm("N1");
        dto.setCdId("G1");
        dto.setCdIdNm("GN1");
        dto.setCdIdExpln("GD1");
        dto.setUseYn("Y");
        dto.setFrstRegisterId("U1");
        dto.setLastUpdusrId("U2");

        assertThat(dto.getClsfCd()).isEqualTo("C1");
        assertThat(dto.getCdId()).isEqualTo("G1");
        assertThat(dto.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("CmmnDetailCodeDto 커버리지")
    void cmmnDetailCodeDto_Coverage() {
        CmmnDetailCodeDto dto = new CmmnDetailCodeDto();
        dto.setCdId("G1");
        dto.setCdIdNm("GN1");
        dto.setDtlCd("C1");
        dto.setDtlCdNm("CN1");
        dto.setDtlCdExpln("CD1");
        dto.setUseYn("Y");
        dto.setFrstRegisterId("U1");
        dto.setLastUpdusrId("U2");

        assertThat(dto.getCdId()).isEqualTo("G1");
        assertThat(dto.getDtlCd()).isEqualTo("C1");
        assertThat(dto.getDtlCdNm()).isEqualTo("CN1");
    }

    @Test
    @DisplayName("AdministCodeDto 커버리지")
    void administCodeDto_Coverage() {
        AdministCodeDto dto = AdministCodeDto.builder()
                .admdstCd("110")
                .admdstZoneNm("Seoul")
                .useYn("Y")
                .build();

        assertThat(dto.getAdmdstCd()).isEqualTo("110");
        assertThat(dto.getAdmdstZoneNm()).isEqualTo("Seoul");
        assertThat(dto.getUseYn()).isEqualTo("Y");
        
        AdministCodeDto fullDto = new AdministCodeDto("1", "S", "N", "U", "Y", "C", "A", "CB", null, "MB", null);
        assertThat(fullDto.getAdmdstCd()).isEqualTo("1");
    }
}
