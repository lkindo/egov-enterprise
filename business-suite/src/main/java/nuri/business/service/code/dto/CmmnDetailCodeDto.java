package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

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
@Schema(description = "공통 상세 코드 정보 DTO")
public class CmmnDetailCodeDto {

    @Schema(description = "코드 ID")
    @Size(max = 20)
    private String cdId;

    @Schema(description = "코드 ID명")
    @Size(max = 100)
    private String cdIdNm;

    @Schema(description = "상세코드")
    @Size(max = 12)
    private String dtlCd;

    @Schema(description = "상세코드명")
    @Size(max = 100)
    private String dtlCdNm;

    @Schema(description = "상세코드설명")
    @Size(max = 4000)
    private String dtlCdExpln;

    @Schema(description = "사용여부")
    @Size(max = 1)
    @NotBlank
    private String useYn;

    @Schema(description = "최초등록자 ID")
    private String frstRgtrId;

    @Schema(description = "최종수정자 ID")
    private String lastMdfrId;

    // Compatibility Getters/Setters for legacy java references
    @JsonIgnore
    public String getCodeId() {
        return cdId;
    }

    @JsonIgnore
    public void setCodeId(String codeId) {
        this.cdId = codeId;
    }

    @JsonIgnore
    public String getCodeIdNm() {
        return cdIdNm;
    }

    @JsonIgnore
    public void setCodeIdNm(String codeIdNm) {
        this.cdIdNm = codeIdNm;
    }

    @JsonIgnore
    public String getCode() {
        return dtlCd;
    }

    @JsonIgnore
    public void setCode(String code) {
        this.dtlCd = code;
    }

    @JsonIgnore
    public String getCodeNm() {
        return dtlCdNm;
    }

    @JsonIgnore
    public void setCodeNm(String codeNm) {
        this.dtlCdNm = codeNm;
    }

    @JsonIgnore
    public String getCodeDc() {
        return dtlCdExpln;
    }

    @JsonIgnore
    public void setCodeDc(String codeDc) {
        this.dtlCdExpln = codeDc;
    }
}

