package com.company.project.service.popup.dto;

import com.company.project.domain.popup.Popup;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "팝업 정보")
public class PopupDto {
    @Schema(description = "팝업 ID")
    private String popupId;
    @Schema(description = "팝업 제목")
    private String popupTitleNm;
    @Schema(description = "파일 URL")
    private String fileUrl;
    @Schema(description = "팝업 가로 위치")
    private String popupWlc;
    @Schema(description = "팝업 세로 위치")
    private String popupHlc;
    @Schema(description = "팝업 높이 크기")
    private String popupHSize;
    @Schema(description = "팝업 너비 크기")
    private String popupWSize;
    @Schema(description = "게시 시작일")
    private String ntceBgnde;
    @Schema(description = "게시 종료일")
    private String ntceEndde;
    @Schema(description = "그만보기 여부")
    private String stopVewAt;
    @Schema(description = "게시 여부")
    private String ntceAt;
    @Schema(description = "생성자 ID")
    private String frstRegisterId;
    @Schema(description = "생성 일시")
    private LocalDateTime frstRegistPnttm;

    public static PopupDto from(Popup entity) {
        if (entity == null)
            return null;
        return PopupDto.builder()
                .popupId(entity.getPopupId())
                .popupTitleNm(entity.getPopupTitleNm())
                .fileUrl(entity.getFileUrl())
                .popupWlc(entity.getPopupWlc())
                .popupHlc(entity.getPopupHlc())
                .popupHSize(entity.getPopupHSize())
                .popupWSize(entity.getPopupWSize())
                .ntceBgnde(entity.getNtceBgnde())
                .ntceEndde(entity.getNtceEndde())
                .stopVewAt(entity.getStopVewAt())
                .ntceAt(entity.getNtceAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
