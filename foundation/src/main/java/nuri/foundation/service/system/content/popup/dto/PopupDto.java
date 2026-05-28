package nuri.foundation.service.system.content.popup.dto;

import jakarta.validation.constraints.*;

import nuri.foundation.domain.system.content.popup.Popup;
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
    @Schema(description = "팝업 ID")
    @Size(max = 20)
    private String popupId;

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

    @Schema(description = "그만보기 여부")
    @Size(max = 1)
    private String stopvewSetupYn;

    @Schema(description = "게시 여부")
    @Size(max = 1)
    private String ntceYn;

    @Schema(description = "생성자 ID")
    private String createdBy;
    @Schema(description = "생성 일시")
    private LocalDateTime createdDate;

    public static PopupDto from(Popup entity) {
        if (entity == null)
            return null;
        return PopupDto.builder()
                .popupId(entity.getPopupId())
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
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
