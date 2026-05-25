package nuri.foundation.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "공통 분류 코드 정보 DTO")
public class CmmnClCodeDto {

    @Schema(description = "분류코드")
    private String clsfCd;

    @Schema(description = "분류코드명")
    private String clsfCdNm;

    @Schema(description = "분류코드설명")
    private String clsfCdExpln;

    @Schema(description = "사용여부")
    private String useYn;

    @Schema(description = "최초등록자 ID")
    private String frstRegisterId;

    @Schema(description = "최종수정자 ID")
    private String lastUpdusrId;

    // Compatibility Getters/Setters for legacy java references
    @JsonIgnore
    public String getClCode() {
        return clsfCd;
    }

    @JsonIgnore
    public void setClCode(String clCode) {
        this.clsfCd = clCode;
    }

    @JsonIgnore
    public String getClCodeNm() {
        return clsfCdNm;
    }

    @JsonIgnore
    public void setClCodeNm(String clCodeNm) {
        this.clsfCdNm = clCodeNm;
    }

    @JsonIgnore
    public String getClCodeDc() {
        return clsfCdExpln;
    }

    @JsonIgnore
    public void setClCodeDc(String clCodeDc) {
        this.clsfCdExpln = clCodeDc;
    }
}

