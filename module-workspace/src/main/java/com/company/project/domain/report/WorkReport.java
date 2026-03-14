package com.company.project.domain.report;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "NWIKMNTHNGREPRT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class WorkReport extends BaseEntity {

    @Id
    @Column(name = "REPRT_ID", length = 20)
    private String reportId;

    @Column(name = "REPRT_SJ", length = 255, nullable = false)
    private String reportSubject;

    @Column(name = "REPRT_CN", length = 4000)
    private String reportContent;

    @Column(name = "REPRT_SE", length = 1)
    private String reportType; // 1: 주간, 2: 월간

    @Column(name = "REPRT_DE", length = 20)
    private String reportDate;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "REPRT_STTUS", length = 1)
    private String reportStatus; // 1: 작업중, 2: 보고완료

    public void update(String reportSubject, String reportContent, String reportType, String reportDate,
            String reportStatus) {
        this.reportSubject = reportSubject;
        this.reportContent = reportContent;
        this.reportType = reportType;
        this.reportDate = reportDate;
        this.reportStatus = reportStatus;
    }
}
