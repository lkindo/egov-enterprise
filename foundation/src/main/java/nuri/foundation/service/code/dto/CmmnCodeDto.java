package nuri.foundation.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Common Code DTO")
public class CmmnCodeDto {

    @Schema(description = "Code ID")
    @JsonProperty("codeId")
    private String cdId;

    @Schema(description = "Code ID Name")
    @JsonProperty("codeIdNm")
    private String cdIdNm;

    @Schema(description = "Code ID Description")
    @JsonProperty("codeIdDc")
    private String cdIdExpln;

    @Schema(description = "Classification Code")
    @JsonProperty("clCode")
    private String clsfCd;

    @Schema(description = "Classification Code Name")
    @JsonProperty("clCodeNm")
    private String clsfCdNm;

    @Schema(description = "Use Y/N")
    private String useYn;

    @Schema(description = "First Register ID")
    private String frstRegisterId;

    @Schema(description = "Last Updater ID")
    private String lastUpdusrId;

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
    public String getCodeIdDc() {
        return cdIdExpln;
    }

    @JsonIgnore
    public void setCodeIdDc(String codeIdDc) {
        this.cdIdExpln = codeIdDc;
    }

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
}

