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
@Schema(description = "Common Detail Code Info")
public class CmmnDetailCodeDto {

    @Schema(description = "Code ID")
    @JsonProperty("codeId")
    private String cdId;

    @Schema(description = "Code ID Name")
    @JsonProperty("codeIdNm")
    private String cdIdNm;

    @Schema(description = "Detail Code")
    @JsonProperty("code")
    private String dtlCd;

    @Schema(description = "Detail Code Name")
    @JsonProperty("codeNm")
    private String dtlCdNm;

    @Schema(description = "Detail Code Description")
    @JsonProperty("codeDc")
    private String dtlCdExpln;

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

