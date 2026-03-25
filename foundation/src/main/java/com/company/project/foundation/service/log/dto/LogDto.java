package com.company.project.foundation.service.log.dto;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 濡쒓???뺣낫 DTO
 */
@Getter
@Builder
public class LogDto {
    private String logId;
    private String conectMthd;
    private String conectId;
    private String conectIp;
    private LocalDateTime creatDt;
    private String errOccrrAt;
}
