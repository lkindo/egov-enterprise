package nuri.business.service.log.dto;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 로그 정보 DTO
 */
@Getter
@Builder
public class LogDto {
    private Long lgnSn;
    private String conectMthd;
    private String conectId;
    private String conectIp;
    private LocalDateTime creatDt;
    private String errOccrrAt;
}
