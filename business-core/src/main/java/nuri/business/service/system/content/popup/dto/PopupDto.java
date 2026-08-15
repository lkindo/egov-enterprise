package nuri.business.service.system.content.popup.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.content.popup.Popup;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "팝업 정보 DTO")
public class PopupDto {
    @Schema(description = "팝업 일련번호", example = "1")
    private Long popupSn;

    @Schema(description = "팝업 제목")
    @Size(max = 100)
    @NotBlank
    private String popupTtlNm;

    @Schema(description = "파일 URL")
    @Size(max = 1000)
    private String fileUrl;

    @Schema(description = "팝업 가로 위치")
    @Size(max = 12)
    private String popupWdthPstn;

    @Schema(description = "팝업 세로 위치")
    @Size(max = 12)
    private String popupVrtcPstn;

    @Schema(description = "팝업 높이 크기")
    @Size(max = 12)
    private String popupVrtcSz;

    @Schema(description = "팝업 너비 크기")
    @Size(max = 12)
    private String popupWdthSz;

    @Schema(description = "게시 시작일")
    private String ntceBgnde;

    @Schema(description = "게시 종료일")
    private String ntceEndde;

    @Schema(description = "그만보기 여부", allowableValues = {"Y", "N"})
    @Size(max = 1)
    @Pattern(regexp = "^(?:Y|N)$")
    private String stopvewSetupYn;

    @Schema(description = "게시 여부", allowableValues = {"Y", "N"})
    @Size(max = 1)
    @Pattern(regexp = "^(?:Y|N)$")
    private String ntceYn;

    @Schema(description = "생성자 ID")
    private String frstRgtrId;
    @Schema(description = "생성 일시")
    private LocalDateTime crtDt;

    public static PopupDto from(Popup entity) {
        if (entity == null)
            return null;
        return PopupDto.builder()
                .popupSn(entity.getPopupSn())
                .popupTtlNm(entity.getPopupTtlNm())
                .fileUrl(entity.getFileUrl())
                .popupWdthPstn(entity.getPopupWdthPstn())
                .popupVrtcPstn(entity.getPopupVrtcPstn())
                .popupVrtcSz(entity.getPopupVrtcSz())
                .popupWdthSz(entity.getPopupWdthSz())
                .ntceBgnde(entity.getNtceBgnde() != null ? entity.getNtceBgnde().toString() : null)
                .ntceEndde(entity.getNtceEndde() != null ? entity.getNtceEndde().toString() : null)
                .stopvewSetupYn(entity.getStopvewSetupYn())
                .ntceYn(entity.getNtceYn())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
