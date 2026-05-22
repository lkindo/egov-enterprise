package nuri.foundation.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Schema(description = "Common Code Save Request")
public record CommonCodeSaveRequest(
        @Schema(description = "Code Group ID")
        @NotBlank(message = "{validation.required}")
        @JsonProperty("codeGroupId")
        String cdId,

        @Schema(description = "Code")
        @NotBlank(message = "{validation.required}")
        @Size(min = 1, max = 20, message = "{validation.size}")
        @JsonProperty("code")
        String dtlCd,

        @Schema(description = "Code Name")
        @NotBlank(message = "{validation.required}")
        @JsonProperty("codeNm")
        String dtlCdNm,

        @Schema(description = "Code Description")
        @JsonProperty("codeDc")
        String dtlCdExpln,

        @Schema(description = "Use Y/N")
        String useYn) {

    // Compatibility Getters for legacy java references
    @JsonIgnore
    public String codeGroupId() {
        return cdId;
    }

    @JsonIgnore
    public String code() {
        return dtlCd;
    }

    @JsonIgnore
    public String codeNm() {
        return dtlCdNm;
    }

    @JsonIgnore
    public String codeDc() {
        return dtlCdExpln;
    }
}

