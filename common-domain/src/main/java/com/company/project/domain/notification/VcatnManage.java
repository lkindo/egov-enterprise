package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NVCATNMANAGE")
@IdClass(VcatnManageId.class)
public class VcatnManage {

    @Id
    @Column(name = "APPLCNT_ID", length = 20)
    private String applcntId;

    @Id
    @Column(name = "VCATN_SE", length = 1)
    private String vcatnSe;

    @Id
    @Column(name = "BGNDE", length = 8)
    private String bgnde;

    @Column(name = "ENDDE", length = 8)
    private String endde;

    @Column(name = "VCATN_RESN", length = 1000)
    private String vcatnResn;

    @Column(name = "REQST_DE", length = 8)
    private String reqstDe;

    @Column(name = "OCCRRNC_YEAR", length = 4)
    private String occrrncYear;

    @Column(name = "NOON_SE", length = 1)
    private String noonSe;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private LocalDateTime sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public VcatnManage(String applcntId, String vcatnSe, String bgnde, String endde, String vcatnResn, String reqstDe,
            String occrrncYear, String noonSe, String sanctnerId, String confmAt, String infrmlSanctnId,
            String frstRegisterId) {
        this.applcntId = applcntId;
        this.vcatnSe = vcatnSe;
        this.bgnde = bgnde;
        this.endde = endde;
        this.vcatnResn = vcatnResn;
        this.reqstDe = reqstDe;
        this.occrrncYear = occrrncYear;
        this.noonSe = noonSe;
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.infrmlSanctnId = infrmlSanctnId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String vcatnResn, String lastUpdusrId) {
        this.vcatnResn = vcatnResn;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    public void confirm(String confmAt, LocalDateTime sanctnDt, String returnResn, String lastUpdusrId) {
        this.confmAt = confmAt;
        this.sanctnDt = sanctnDt;
        this.returnResn = returnResn;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
