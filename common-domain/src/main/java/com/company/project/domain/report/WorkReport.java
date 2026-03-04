package com.company.project.domain.report;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "NWIKMNTHNGREPRT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class WorkReport extends BaseTimeEntity {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String reportId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String reportSubject;

    @Column(name = "REPRT_CN", length = 4000)
    private String reportContent;

    @Column(name = "REPRT_SE", length = 1)
    private String reportType; // 1:雅뚯눊而? 2:?遺쎌퍢

    @Column(name = "REPRT_DE", length = 20)
    private String reportDate;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "REPRT_STTUS", length = 1)
    private String reportStatus; // 1:?臾믨쉐餓? 2:癰귣떯??袁⑥┷

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String reportSubject, String reportContent, String reportType, String reportDate,
            String reportStatus, String lastUpdusrId) {
        this.reportSubject = reportSubject;
        this.reportContent = reportContent;
        this.reportType = reportType;
        this.reportDate = reportDate;
        this.reportStatus = reportStatus;
        this.lastUpdusrId = lastUpdusrId;
    }
}