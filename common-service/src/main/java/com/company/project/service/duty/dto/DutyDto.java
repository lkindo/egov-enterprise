package com.company.project.service.duty.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DutyDto {
    private String bndtId;
    private String bndtDe;
    private String remark;
    private List<DutyDiaryDto> diaries;
    private String frstRegisterId;
    private java.time.LocalDateTime frstRegistPnttm;
}
