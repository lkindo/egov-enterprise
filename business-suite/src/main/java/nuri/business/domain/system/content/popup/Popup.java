package nuri.business.domain.system.content.popup;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;

import nuri.business.domain.common.BaseEntity;
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
    @Column(length = 20)
    private String popupId;

    @Column(length = 100, nullable = false)
    private String popupTtlNm;

    @Column(length = 1000)
    private String fileUrl;

    @Column(length = 12)
    private String popupWdthPstn;

    @Column(length = 12)
    private String popupVrtcPstn;

    @Column(length = 12)
    private String popupVrtcSz;

    @Column(length = 12)
    private String popupWdthSz;

    private LocalDate ntceBgnde;

    private LocalDate ntceEndde;

    @Column(length = 1)
    private String stopvewSetupYn;

    @Column(length = 1)
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
