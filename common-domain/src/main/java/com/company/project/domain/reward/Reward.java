package com.company.project.domain.reward;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity(name = "DomainReward")
@Table(name = "NRWARDMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
public class Reward {

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

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @PrePersist
    protected void onCreate() {
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
        if (this.confmAt == null)
            this.confmAt = "R";
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String rwardCode, String rwardDe, String rwardNm, String pblenCn, String atchFileId,
            String lastUpdusrId) {
        this.rwardCode = rwardCode;
        this.rwardDe = rwardDe;
        this.rwardNm = rwardNm;
        this.pblenCn = pblenCn;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void confirm(String confmAt, LocalDateTime sanctnDt, String returnResn, String lastUpdusrId) {
        this.confmAt = confmAt;
        this.sanctnDt = sanctnDt;
        this.returnResn = returnResn;
        this.lastUpdusrId = lastUpdusrId;
    }
}