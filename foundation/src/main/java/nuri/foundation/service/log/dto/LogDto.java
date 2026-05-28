package nuri.foundation.service.log.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 로그 정보 DTO
 */
@Getter
@Builder
public class LogDto {
    @Size(max = 20)
    private String logId;
    private String conectMthd;
    private String conectId;
    private String conectIp;
    private LocalDateTime creatDt;
    private String errOccrrAt;
}
