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
@Table(name = "NRWARDMANAGE")
public class RwardManage {

    @Id
    @Column(name = "RWARD_ID", length = 20)
    private String rwardId;

    @Column(name = "RWARDWNR_ID", length = 20)
    private String rwardwnrId;

    @Column(name = "RWARD_CODE", length = 3)
    private String rwardCode;

    @Column(name = "RWARD_DE", length = 8)
    private String rwardDe;

    @Column(name = "RWARD_NM", length = 255)
    private String rwardNm;

    @Column(name = "PBLEN_CN", length = 1000)
    private String pblenCn;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private LocalDateTime sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

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
    public RwardManage(String rwardId, String rwardwnrId, String rwardCode, String rwardDe, String rwardNm,
            String pblenCn, String sanctnerId, String confmAt, LocalDateTime sanctnDt, String atchFileId,
            String infrmlSanctnId, String frstRegisterId) {
        this.rwardId = rwardId;
        this.rwardwnrId = rwardwnrId;
        this.rwardCode = rwardCode;
        this.rwardDe = rwardDe;
        this.rwardNm = rwardNm;
        this.pblenCn = pblenCn;
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt;
        this.sanctnDt = sanctnDt;
        this.atchFileId = atchFileId;
        this.infrmlSanctnId = infrmlSanctnId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String rwardCode, String rwardDe, String rwardNm, String pblenCn, String atchFileId,
            String lastUpdusrId) {
        this.rwardCode = rwardCode;
        this.rwardDe = rwardDe;
        this.rwardNm = rwardNm;
        this.pblenCn = pblenCn;
        this.atchFileId = atchFileId;
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
