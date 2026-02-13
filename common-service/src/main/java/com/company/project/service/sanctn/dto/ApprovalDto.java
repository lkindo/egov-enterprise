package com.company.project.service.sanctn.dto;

import com.company.project.domain.sanctn.InformalSanctn;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalDto {
    private String approvalId;
    private String jobType; // COM060 (1:주간, 2:월간, 01:연차 등)
    private String jobTypeNm;
    private String applicantId;
    private String requestDate;
    private String approverId;
    private String status; // R:신청, Y:승인, N:반려
    private LocalDateTime approvalDate;
    private String returnReason;

    public static ApprovalDto from(InformalSanctn entity) {
        return ApprovalDto.builder()
                .approvalId(entity.getInfrmlSanctnId())
                .jobType(entity.getJobSeCode())
                .applicantId(entity.getApplcntId())
                .requestDate(entity.getReqstDe())
                .approverId(entity.getSanctnerId())
                .status(entity.getConfmAt())
                .approvalDate(entity.getSanctnDt())
                .returnReason(entity.getReturnReason())
                .build();
    }
}
