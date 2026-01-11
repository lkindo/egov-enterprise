package com.company.project.domain.popup;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 팝업창 관리 JPA Entity
 * 레거시 테이블: COMTNPOPUPMANAGE
 */
@Entity(name = "PopupDomain")
@Table(name = "COMTNPOPUPMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Popup {

    @Id
    @Column(name = "POPUP_ID", length = 20)
    private String popupId;

    @Column(name = "POPUP_TITLE_NM", length = 255, nullable = false)
    private String popupTitleNm;

    @Column(name = "FILE_URL", length = 255)
    private String fileUrl;

    @Column(name = "POPUP_WLC", length = 20)
    private String popupWlc;

    @Column(name = "POPUP_HLC", length = 20)
    private String popupHlc;

    @Column(name = "POPUP_H_SIZE", length = 20)
    private String popupHSize;

    @Column(name = "POPUP_W_SIZE", length = 20)
    private String popupWSize;

    @Column(name = "NTCE_BGNDE", length = 20)
    private String ntceBgnde;

    @Column(name = "NTCE_ENDDE", length = 20)
    private String ntceEndde;

    @Column(name = "STOP_VEW_AT", length = 1)
    private String stopVewAt;

    @Column(name = "NTCE_AT", length = 1)
    private String ntceAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Popup(String popupId, String popupTitleNm, String fileUrl, String popupWlc,
            String popupHlc, String popupHSize, String popupWSize, String ntceBgnde,
            String ntceEndde, String stopVewAt, String ntceAt, String frstRegisterId) {
        this.popupId = popupId;
        this.popupTitleNm = popupTitleNm;
        this.fileUrl = fileUrl;
        this.popupWlc = popupWlc;
        this.popupHlc = popupHlc;
        this.popupHSize = popupHSize;
        this.popupWSize = popupWSize;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopVewAt = stopVewAt;
        this.ntceAt = ntceAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String popupTitleNm, String fileUrl, String popupWlc, String popupHlc,
            String popupHSize, String popupWSize, String ntceBgnde, String ntceEndde,
            String stopVewAt, String ntceAt, String updusrId) {
        this.popupTitleNm = popupTitleNm;
        this.fileUrl = fileUrl;
        this.popupWlc = popupWlc;
        this.popupHlc = popupHlc;
        this.popupHSize = popupHSize;
        this.popupWSize = popupWSize;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopVewAt = stopVewAt;
        this.ntceAt = ntceAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
