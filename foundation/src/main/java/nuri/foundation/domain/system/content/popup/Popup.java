package nuri.foundation.domain.system.content.popup;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

@EntityListeners(AuditingEntityListener.class)
@Entity(name = "PopupDomain")
@Table(name = "tb_popup_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Popup extends BaseEntity {

    @Id
    @Column(name = "popup_id", length = 20)
    private String popupId;

    @Column(name = "popup_ttl_nm", length = 1024, nullable = false)
    private String popupTitleName;

    @Column(name = "file_url", length = 1024)
    private String fileUrl;

    @Column(name = "popup_wdth_pstn", length = 20)
    private String popupWidthLocation;

    @Column(name = "popup_vrtc_pstn", length = 20)
    private String popupHeightLocation;

    @Column(name = "popup_vrtc_sz", length = 20)
    private String popupHeightSize;

    @Column(name = "popup_wdth_sz", length = 20)
    private String popupWidthSize;

    @Column(name = "ntce_bgnde")
    private LocalDate noticeBeginDate;

    @Column(name = "ntce_endde")
    private LocalDate noticeEndDate;

    @Column(name = "stopvew_setup_yn", length = 1)
    private String isStopView;

    @Column(name = "ntce_yn", length = 1)
    private String isNotice;

    public Popup(String popupId, String popupTitleName, String fileUrl, String popupWidthLocation,
            String popupHeightLocation, String popupHeightSize, String popupWidthSize,
            LocalDate noticeBeginDate, LocalDate noticeEndDate, String isStopView, String isNotice) {
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
            String popupHeightSize, String popupWidthSize, LocalDate noticeBeginDate, LocalDate noticeEndDate,
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

    // legacy getters for compatibility
    public String getPopupSjNm() { return popupTitleName; }
}
