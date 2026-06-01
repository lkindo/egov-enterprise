package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.code.CommonCode;
import io.swagger.v3.oas.annotations.media.Schema;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Schema(description = "공통코드 DTO")
public record CommonCodeDto(
        @NotBlank @Size(max = 20) @Schema(description = "코드그룹 ID") String cdId,

        @NotBlank @Size(max = 12) @Schema(description = "코드") String dtlCd,

        @NotBlank @Size(max = 100) @Schema(description = "코드명") String dtlCdNm,

        @Size(max = 4000) @Schema(description = "코드설명") String dtlCdExpln,

        @NotBlank @Size(max = 1) @Schema(description = "사용여부") String useYn) {

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

