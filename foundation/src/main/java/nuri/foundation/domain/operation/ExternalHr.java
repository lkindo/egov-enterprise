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
    private String evntId;

    @Id
    @Column(name = "otsd_hr_id", length = 20)
    private String otsdHrId;

    @Column(name = "gndr_cd", length = 12)
    private String gndrCd;

    @Column(name = "otsd_hr_nm", length = 100)
    private String otsdHrNm;

    @Column(name = "cr_type_cd", length = 12)
    private String crTypeCd;

    @Column(name = "ogdp_inst_nm", length = 100)
    private String ogdpInstNm;

    @Column(name = "brdt_ymd", length = 8)
    private String brdtYmd;

    @Column(name = "area_no", length = 4)
    private String areaNo;

    @Column(name = "md_telno", length = 4)
    private String mdTelno;

    @Column(name = "end_telno", length = 4)
    private String endTelno;

    @Column(name = "eml_addr", length = 100)
    private String emlAddr;

    @Column(name = "crt_dt")
    private LocalDateTime crtDt;

    @Column(name = "frst_rgtr_id", length = 20)
    private String frstRgtrId;

    @Column(name = "mdfcn_dt")
    private LocalDateTime mdfcnDt;

    @Column(name = "last_mdfr_id", length = 20)
    private String lastMdfrId;

    // ----- [Legacy Getter Aliases] -----

    public LocalDateTime getFrstRegistPnttm() {
        return this.crtDt;
    }

    public String getFrstRegisterId() {
        return this.frstRgtrId;
    }

    public LocalDateTime getLastUpdtPnttm() {
        return this.mdfcnDt;
    }

    public String getLastUpdusrId() {
        return this.lastMdfrId;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "EVNT_ID", insertable = false, updatable = false)
    private EventInfo event;

    @Builder
    public ExternalHr(String evntId, String otsdHrId, String gndrCd, String otsdHrNm,
                      String crTypeCd, String ogdpInstNm, String brdtYmd, String areaNo,
                      String mdTelno, String endTelno, String emlAddr,
                      String frstRegisterId, String lastUpdusrId) {
        this.evntId = evntId;
        this.otsdHrId = otsdHrId;
        this.gndrCd = gndrCd;
        this.otsdHrNm = otsdHrNm;
        this.crTypeCd = crTypeCd;
        this.ogdpInstNm = ogdpInstNm;
        this.brdtYmd = brdtYmd;
        this.areaNo = areaNo;
        this.mdTelno = mdTelno;
        this.endTelno = endTelno;
        this.emlAddr = emlAddr;
        this.frstRgtrId = frstRegisterId;
        this.crtDt = LocalDateTime.now();
        this.lastMdfrId = lastUpdusrId;
        this.mdfcnDt = LocalDateTime.now();
    }
}
