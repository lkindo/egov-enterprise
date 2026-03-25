package com.company.project.foundation.domain.system.content.popup;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

@EntityListeners(AuditingEntityListener.class)
@Entity(name = "PopupDomain")
@Table(name = "NPOPUPMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Popup extends BaseEntity {

    @Id
    @Column(name = "POPUP_ID", length = 20)
    private String popupId;

    @Column(name = "POPUP_SJ_NM", length = 1024, nullable = false)
    private String popupTitleName;

    @Column(name = "FILE_URL", length = 1024)
    private String fileUrl;

    @Column(name = "POPUP_WIDTH_LC", length = 20)
    private String popupWidthLocation;

    @Column(name = "POPUP_VRTICL_LC", length = 20)
    private String popupHeightLocation;

    @Column(name = "POPUP_VRTICL_SIZE", length = 20)
    private String popupHeightSize;

    @Column(name = "POPUP_WIDTH_SIZE", length = 20)
    private String popupWidthSize;

    @Column(name = "NTCE_BGNDE", length = 20)
    private String noticeBeginDate;

    @Column(name = "NTCE_ENDDE", length = 20)
    private String noticeEndDate;

    @Column(name = "STOPVEW_SETUP_AT", length = 1)
    private String isStopView;

    @Column(name = "NTCE_AT", length = 1)
    private String isNotice;

    public Popup(String popupId, String popupTitleName, String fileUrl, String popupWidthLocation,
            String popupHeightLocation, String popupHeightSize, String popupWidthSize,
            String noticeBeginDate, String noticeEndDate, String isStopView, String isNotice) {
        this.popupId = popupId;
        this.popupTitleName = popupTitleName;
        this.fileUrl = fileUrl;
        this.popupWidthLocation = popupWidthLocation;
        this.popupHeightLocation = popupHeightLocation;
        this.popupHeightSize = popupHeightSize;
        this.popupWidthSize = popupWidthSize;
        this.noticeBeginDate = noticeBeginDate;
        this.noticeEndDate = noticeEndDate;
        this.isStopView = isStopView;
        this.isNotice = isNotice;
    }

    public void update(String popupTitleName, String fileUrl, String popupWidthLocation, String popupHeightLocation,
            String popupHeightSize, String popupWidthSize, String noticeBeginDate, String noticeEndDate,
            String isStopView, String isNotice) {
        this.popupTitleName = popupTitleName;
        this.fileUrl = fileUrl;
        this.popupWidthLocation = popupWidthLocation;
        this.popupHeightLocation = popupHeightLocation;
        this.popupHeightSize = popupHeightSize;
        this.popupWidthSize = popupWidthSize;
        this.noticeBeginDate = noticeBeginDate;
        this.noticeEndDate = noticeEndDate;
        this.isStopView = isStopView;
        this.isNotice = isNotice;
    }
}
