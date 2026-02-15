package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity(name = "NotificationPopup")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NPOPUPMANAGE")
public class Popup {

    @Id
    @Column(name = "POPUP_ID", length = 20)
    private String popupId;

    @Column(name = "POPUP_SJ_NM", length = 255)
    private String popupSjNm;

    @Column(name = "FILE_URL", length = 255)
    private String fileUrl;

    @Column(name = "POPUP_VRTICL_LC", length = 10)
    private String popupVrticlLc;

    @Column(name = "POPUP_WIDTH_LC", length = 10)
    private String popupWidthLc;

    @Column(name = "POPUP_VRTICL_SIZE")
    private Integer popupVrticlSize;

    @Column(name = "POPUP_WIDTH_SIZE")
    private Integer popupWidthSize;

    @Column(name = "NTCE_BGNDE", length = 20)
    private String ntceBgnde;

    @Column(name = "NTCE_ENDDE", length = 20)
    private String ntceEndde;

    @Column(name = "STOPVEW_SETUP_AT", length = 1)
    private String stopvewSetupAt;

    @Column(name = "NTCE_AT", length = 1)
    private String ntceAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Popup(String popupId, String popupSjNm, String fileUrl, String popupVrticlLc, String popupWidthLc,
            Integer popupVrticlSize, Integer popupWidthSize, String ntceBgnde, String ntceEndde, String stopvewSetupAt,
            String ntceAt, String frstRegisterId) {
        this.popupId = popupId;
        this.popupSjNm = popupSjNm;
        this.fileUrl = fileUrl;
        this.popupVrticlLc = popupVrticlLc;
        this.popupWidthLc = popupWidthLc;
        this.popupVrticlSize = popupVrticlSize;
        this.popupWidthSize = popupWidthSize;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopvewSetupAt = stopvewSetupAt;
        this.ntceAt = ntceAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String popupSjNm, String fileUrl, String popupVrticlLc, String popupWidthLc,
            Integer popupVrticlSize, Integer popupWidthSize, String ntceBgnde, String ntceEndde, String stopvewSetupAt,
            String ntceAt, String lastUpdusrId) {
        this.popupSjNm = popupSjNm;
        this.fileUrl = fileUrl;
        this.popupVrticlLc = popupVrticlLc;
        this.popupWidthLc = popupWidthLc;
        this.popupVrticlSize = popupVrticlSize;
        this.popupWidthSize = popupWidthSize;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopvewSetupAt = stopvewSetupAt;
        this.ntceAt = ntceAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
