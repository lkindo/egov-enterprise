package com.company.project.service.popup.dto;

import com.company.project.domain.popup.Popup;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 팝업창 DTO
 */
@Getter
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
    private LocalDateTime frstRegisterPnttm;

    public static PopupDto from(Popup entity) {
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
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
