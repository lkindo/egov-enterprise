package com.company.project.domain.deptjob;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 부서업무 엔티티
 * 
 * @see COMTNDEPTJOB 테이블 매핑
 */
@Entity
@Table(name = "COMTNDEPTJOB")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class DeptJob {

    @Id
    @Column(name = "DEPT_JOB_ID", length = 20)
    private String deptJobId;

    @Column(name = "DEPT_JOBBX_ID", length = 20)
    private String deptJobbxId;

    @Column(name = "DEPT_JOB_NM", length = 255)
    private String deptJobNm;

    @Column(name = "DEPT_JOB_CN", columnDefinition = "TEXT")
    private String deptJobCn;

    @Column(name = "CHARGER_ID", length = 20)
    private String chargerId;

    @Column(name = "PRIORT", length = 1)
    private String priort; // 1: 높음, 2: 보통, 3: 낮음

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    public void update(String deptJobbxId, String deptJobNm, String deptJobCn, String chargerId, String priort,
            String atchFileId, String lastUpdusrId) {
        this.deptJobbxId = deptJobbxId;
        this.deptJobNm = deptJobNm;
        this.deptJobCn = deptJobCn;
        this.chargerId = chargerId;
        this.priort = priort;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = lastUpdusrId;
    }
}
