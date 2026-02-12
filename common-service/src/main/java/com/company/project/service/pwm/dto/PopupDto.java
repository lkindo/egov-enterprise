package com.company.project.service.pwm.dto;

import com.company.project.domain.popup.Popup;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PopupDto {
    private String popupId;
    private String popupTitleNm;
    private String fileUrl;
    private String popupWlc;
    private String popupHlc;
    private String popupHSize;
    private String popupWSize;
    private String ntceBgnde;
    private String ntceEndde;
    private String stopVewAt;
    private String ntceAt;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;

    public static PopupDto from(Popup entity) {
        if (entity == null) return null;
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
