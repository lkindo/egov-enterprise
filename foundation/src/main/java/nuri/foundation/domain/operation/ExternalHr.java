package nuri.foundation.domain.operation;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_extrl_hr_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ExternalHrId.class)
public class ExternalHr {

    @Id
    @Column(name = "evnt_id", length = 20)
    private String eventId;

    @Id
    @Column(name = "otsd_hr_id", length = 20)
    private String extrlHrId;

    @Column(name = "gndr_cd", length = 1)
    private String sexdstnCode;

    @Column(name = "otsd_hr_nm", length = 60)
    private String extrlHrNm;

    @Column(name = "cr_type_cd", length = 1)
    private String occpTyCode;

    @Column(name = "ogdp_inst_nm", length = 100)
    private String psitnInsttNm;

    @Column(name = "brdt_ymd", length = 20)
    private String brthdy;

    @Column(name = "area_no", length = 4)
    private String areaNo;

    @Column(name = "md_telno", length = 4)
    private String middleTelno;

    @Column(name = "end_telno", length = 4)
    private String endTelno;

    @Column(name = "eml_addr", length = 300)
    private String emailAdres;

    @Column(name = "crt_dt")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "frst_rgtr_id", length = 20)
    private String frstRegisterId;

    @Column(name = "mdfcn_dt")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "last_mdfr_id", length = 20)
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
