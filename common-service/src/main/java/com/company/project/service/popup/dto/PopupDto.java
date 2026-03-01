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
@Schema(description = "?ì—… ?•ë³´")
public class PopupDto {
    @Schema(description = "?ì—… ID")
    private String popupId;
    @Schema(description = "?ì—… ?œëª©")
    private String popupTitleNm;
    @Schema(description = "?Œì¼ URL")
    private String fileUrl;
    @Schema(description = "?ì—… ê°€ë¡??„ì¹˜")
    private String popupWlc;
    @Schema(description = "?ì—… ?¸ë¡œ ?„ì¹˜")
    private String popupHlc;
    @Schema(description = "?ì—… ?’ì´ ?¬ê¸°")
    private String popupHSize;
    @Schema(description = "?ì—… ?ˆë¹„ ?¬ê¸°")
    private String popupWSize;
    @Schema(description = "ê²Œì‹œ ?œì‘??)
    private String ntceBgnde;
    @Schema(description = "ê²Œì‹œ ì¢…ë£Œ??)
    private String ntceEndde;
    @Schema(description = "ê·¸ë§Œë³´ê¸° ?¬ë?")
    private String stopVewAt;
    @Schema(description = "ê²Œì‹œ ?¬ë?")
    private String ntceAt;
    @Schema(description = "?ì„±??ID")
    private String frstRegisterId;
    @Schema(description = "?ì„± ?¼ì‹œ")
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
