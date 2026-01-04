package com.company.project.service.user.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommuteDto {
    private String commuteId;
    private String userId;
    private String startTime;
    private String endTime;
    private String workHours;
    private String overtimeHours;
    private String startStatus;
    private String endStatus;
}
