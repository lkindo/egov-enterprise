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

    @Column(name = "popup_ttl_nm", length = 100, nullable = false)
    private String popupTtlNm;

    @Column(name = "file_url", length = 1000)
    private String fileUrl;

    @Column(name = "popup_wdth_pstn", length = 12)
    private String popupWdthPstn;

    @Column(name = "popup_vrtc_pstn", length = 12)
    private String popupVrtcPstn;

    @Column(name = "popup_vrtc_sz", length = 12)
    private String popupVrtcSz;

    @Column(name = "popup_wdth_sz", length = 12)
    private String popupWdthSz;

    @Column(name = "ntce_bgnde")
    private LocalDate ntceBgnde;

    @Column(name = "ntce_endde")
    private LocalDate ntceEndde;

    @Column(name = "stopvew_setup_yn", length = 1)
    private String stopvewSetupYn;

    @Column(name = "ntce_yn", length = 1)
    private String ntceYn;

    public Popup(String popupId, String popupTtlNm, String fileUrl, String popupWdthPstn,
            String popupVrtcPstn, String popupVrtcSz, String popupWdthSz,
            LocalDate ntceBgnde, LocalDate ntceEndde, String stopvewSetupYn, String ntceYn) {
        this.popupId = popupId;
        this.popupTtlNm = popupTtlNm;
        this.fileUrl = fileUrl;
        this.popupWdthPstn = popupWdthPstn;
        this.popupVrtcPstn = popupVrtcPstn;
        this.popupVrtcSz = popupVrtcSz;
        this.popupWdthSz = popupWdthSz;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopvewSetupYn = stopvewSetupYn;
        this.ntceYn = ntceYn;
    }

    public void update(String popupTtlNm, String fileUrl, String popupWdthPstn, String popupVrtcPstn,
            String popupVrtcSz, String popupWdthSz, LocalDate ntceBgnde, LocalDate ntceEndde,
            String stopvewSetupYn, String ntceYn) {
        this.popupTtlNm = popupTtlNm;
        this.fileUrl = fileUrl;
        this.popupWdthPstn = popupWdthPstn;
        this.popupVrtcPstn = popupVrtcPstn;
        this.popupVrtcSz = popupVrtcSz;
        this.popupWdthSz = popupWdthSz;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopvewSetupYn = stopvewSetupYn;
        this.ntceYn = ntceYn;
    }
}
