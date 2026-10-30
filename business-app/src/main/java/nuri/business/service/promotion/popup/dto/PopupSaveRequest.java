package nuri.business.service.promotion.popup.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.foundation.core.json.StrictStringDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;

/** 팝업 저장 제약은 요청에만 적용하여 과거 비정규 크기의 조회를 보존한다. */
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "팝업 저장 요청")
public record PopupSaveRequest(
        @NotBlank @Size(max = 100) String popupTtlNm,
        @Size(max = 1000) String fileUrl,
        @Size(max = 12) String popupWdthPstn,
        @Size(max = 12) String popupVrtcPstn,
        @Size(max = 12) @Pattern(regexp = PopupSaveRequest.SIZE_PATTERN, message = PopupSaveRequest.SIZE_MESSAGE)
        @JsonDeserialize(using = StrictStringDeserializer.class)
        @Schema(description = "팝업 높이: 100~4000 정수 문자열. null·생략은 값을 비웁니다.",
                nullable = true, types = {"string", "null"})
        String popupVrtcSz,
        @Size(max = 12) @Pattern(regexp = PopupSaveRequest.SIZE_PATTERN, message = PopupSaveRequest.SIZE_MESSAGE)
        @JsonDeserialize(using = StrictStringDeserializer.class)
        @Schema(description = "팝업 너비: 100~4000 정수 문자열. null·생략은 값을 비웁니다.",
                nullable = true, types = {"string", "null"})
        String popupWdthSz,
        String ntceBgnde,
        String ntceEndde,
        @Size(max = 1) @Pattern(regexp = "^(?:Y|N)$")
        @Schema(description = "그만보기 여부", allowableValues = {"Y", "N"}) String stopvewSetupYn,
        @Size(max = 1) @Pattern(regexp = "^(?:Y|N)$")
        @Schema(description = "게시 여부", allowableValues = {"Y", "N"}) String ntceYn,
        @Min(0)
        @Schema(description = "조회한 수정 버전. 수정 시 서비스에서 필수로 대조하며 등록에서는 무시합니다.")
        Integer version) {
    public static final String SIZE_PATTERN = "^(?:[1-9][0-9]{2}|[1-3][0-9]{3}|4000)$";
    public static final String SIZE_MESSAGE = "팝업 크기는 100~4,000 사이의 정수 문자열로 입력하세요.";

    public PopupDto toDto() {
        return PopupDto.builder().popupTtlNm(popupTtlNm).fileUrl(fileUrl)
                .popupWdthPstn(popupWdthPstn).popupVrtcPstn(popupVrtcPstn)
                .popupVrtcSz(popupVrtcSz).popupWdthSz(popupWdthSz)
                .ntceBgnde(ntceBgnde).ntceEndde(ntceEndde)
                .stopvewSetupYn(stopvewSetupYn).ntceYn(ntceYn).version(version).build();
    }
}
