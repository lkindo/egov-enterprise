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

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NINFRMLSANCTN")
public class InfrmlSanctn {

    @Id
    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;

    @Column(name = "JOB_SE_CODE", length = 3)
    private String jobSeCode;

    @Column(name = "APPLCNT_ID", length = 20)
    private String applcntId;

    @Column(name = "REQST_DE", length = 20)
    private String reqstDe;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private LocalDateTime sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public InfrmlSanctn(String infrmlSanctnId, String jobSeCode, String applcntId, String reqstDe, String sanctnerId,
            String confmAt, String frstRegisterId) {
        this.infrmlSanctnId = infrmlSanctnId;
        this.jobSeCode = jobSeCode;
        this.applcntId = applcntId;
        this.reqstDe = reqstDe;
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String sanctnerId, String lastUpdusrId) {
        this.sanctnerId = sanctnerId;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }

    public void confirm(String confmAt, String returnResn, String lastUpdusrId) {
        this.confmAt = confmAt;
        this.returnResn = returnResn;
        this.sanctnDt = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
