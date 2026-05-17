package nuri.foundation.domain.operation;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "TB_EXTRL_HR_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ExternalHrId.class)
public class ExternalHr {

    @Id
    @Column(name = "EVNT_ID", length = 20)
    private String eventId;

    @Id
    @Column(name = "OTSD_HR_ID", length = 20)
    private String extrlHrId;

    @Column(name = "GNDR_CD", length = 1)
    private String sexdstnCode;

    @Column(name = "OTSD_HR_NM", length = 60)
    private String extrlHrNm;

    @Column(name = "CR_TYPE_CD", length = 1)
    private String occpTyCode;

    @Column(name = "OGDP_INST_NM", length = 100)
    private String psitnInsttNm;

    @Column(name = "BRDT_YMD", length = 20)
    private String brthdy;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MD_TELNO", length = 4)
    private String middleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "EML_ADDR", length = 300)
    private String emailAdres;

    @Column(name = "CRT_DT")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "FRST_RGTR_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "MDFCN_DT")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "LAST_MDFR_ID", length = 20)
    private String lastUpdusrId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "EVNT_ID", insertable = false, updatable = false)
    private EventInfo event;

    @Builder
    public ExternalHr(String eventId, String extrlHrId, String sexdstnCode, String extrlHrNm,
                      String occpTyCode, String psitnInsttNm, String brthdy, String areaNo,
                      String middleTelno, String endTelno, String emailAdres,
                      String frstRegisterId, String lastUpdusrId) {
        this.eventId = eventId;
        this.extrlHrId = extrlHrId;
        this.sexdstnCode = sexdstnCode;
        this.extrlHrNm = extrlHrNm;
        this.occpTyCode = occpTyCode;
        this.psitnInsttNm = psitnInsttNm;
        this.brthdy = brthdy;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.emailAdres = emailAdres;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
