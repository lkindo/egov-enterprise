package com.company.project.domain.operation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "NRWARDMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RewardManage {

    @Id
    @Column(name = "RWARD_ID", length = 20)
    private String rwardId;

    @Column(name = "RWARDWNR_ID", length = 20, nullable = false)
    private String rwardwnrId;

    @Column(name = "RWARD_CODE", length = 2, nullable = false)
    private String rwardCode;

    @Column(name = "RWARD_DE", length = 20, nullable = false)
    private String rwardDe;

    @Column(name = "RWARD_NM", length = 255, nullable = false)
    private String rwardNm;

    @Column(name = "PBLEN_CN", length = 1000)
    private String pblenCn;

    @Column(name = "SANCTNER_ID", length = 20, nullable = false)
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
    private String informlSanctnId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Builder
    public RewardManage(String rwardId, String rwardwnrId, String rwardCode, String rwardDe,
                        String rwardNm, String pblenCn, String sanctnerId, String confmAt,
                        LocalDateTime sanctnDt, String returnResn, String atchFileId,
                        String informlSanctnId, String frstRegisterId, String lastUpdusrId) {
        this.rwardId = rwardId;
        this.rwardwnrId = rwardwnrId;
        this.rwardCode = rwardCode;
        this.rwardDe = rwardDe;
        this.rwardNm = rwardNm;
        this.pblenCn = pblenCn;
        this.sanctnerId = sanctnerId;
        this.confmAt = confmAt == null ? "N" : confmAt;
        this.sanctnDt = sanctnDt;
        this.returnResn = returnResn;
        this.atchFileId = atchFileId;
        this.informlSanctnId = informlSanctnId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
