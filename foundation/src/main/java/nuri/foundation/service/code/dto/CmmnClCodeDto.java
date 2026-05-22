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
@Schema(description = "Common Classification Code Info")
public class CmmnClCodeDto {

    @Schema(description = "Classification Code")
    @JsonProperty("clCode")
    private String clsfCd;

    @Schema(description = "Classification Code Name")
    @JsonProperty("clCodeNm")
    private String clsfCdNm;

    @Schema(description = "Classification Code Description")
    @JsonProperty("clCodeDc")
    private String clsfCdExpln;

    @Schema(description = "Use Y/N")
    private String useYn;

    @Schema(description = "First Register ID")
    private String frstRegisterId;

    @Schema(description = "Last Updater ID")
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

