package com.company.project.domain.duty;

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
@Table(name = "NBNDTMANAGE")
@IdClass(BndtManageId.class)
public class BndtManage {

    @Id
    @Column(name = "BNDT_ID", length = 20)
    private String bndtId;

    @Id
    @Column(name = "BNDT_DE", length = 8)
    private String bndtDe;

    @Column(name = "RM", length = 255)
    private String remark;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public BndtManage(String bndtId, String bndtDe, String remark, String frstRegisterId) {
        this.bndtId = bndtId;
        this.bndtDe = bndtDe;
        this.remark = remark;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String remark, String lastUpdusrId) {
        this.remark = remark;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
