package nuri.foundation.service.code.dto;

import nuri.foundation.domain.code.CommonCode;
import io.swagger.v3.oas.annotations.media.Schema;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Schema(description = "Description")
public record CommonCodeDto(
        @Schema(description = "Description") @JsonProperty("codeGroupId") String cdId,

        @Schema(description = "Description") @JsonProperty("code") String dtlCd,

        @Schema(description = "Description") @JsonProperty("codeNm") String dtlCdNm,

        @Schema(description = "Description") @JsonProperty("codeDc") String dtlCdExpln,

        @Schema(description = "Description") @JsonProperty("useAt") String useYn) {

    // Compatibility Getters for legacy java references
    @JsonIgnore
    public String getCodeGroupId() {
        return cdId;
    }

    @JsonIgnore
    public String codeGroupId() {
        return cdId;
    }

    @JsonIgnore
    public String getCode() {
        return dtlCd;
    }

    @JsonIgnore
    public String code() {
        return dtlCd;
    }

    @JsonIgnore
    public String getCodeNm() {
        return dtlCdNm;
    }

    @JsonIgnore
    public String codeNm() {
        return dtlCdNm;
    }

    @JsonIgnore
    public String getCodeDc() {
        return dtlCdExpln;
    }

    @JsonIgnore
    public String codeDc() {
        return dtlCdExpln;
    }

    @JsonIgnore
    public String getUseAt() {
        return useYn;
    }

    @JsonIgnore
    public String useAt() {
        return useYn;
    }

    public static CommonCodeDto from(CommonCode entity) {
        return new CommonCodeDto(
                entity.getCdId(),
                entity.getDtlCd(),
                entity.getDtlCdNm(),
                entity.getDtlCdExpln(),
                entity.getUseYn());
    }
}

