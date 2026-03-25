package com.company.project.business.service.report.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkReportDto {
    private String reportId;
    private String reportSubject;
    private String reportContent;
    private String reportType;
    private String reportDate;
    private String writerId;
    private String reportStatus;
}
