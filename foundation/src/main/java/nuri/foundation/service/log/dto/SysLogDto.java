package nuri.foundation.service.log.dto;

import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 시스템 로그 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SysLogDto {
    /** 요청 ID */
    @Size(max = 20)
    private String dmndId;
    /** 서비스명 */
    @Size(max = 100)
    private String srvcNm;
    /** 메서드명 */
    private String methodNm;
    /** 처리구분코드 */
    @Size(max = 12)
    private String prcsSeCd;
    /** 처리시간 */
    @Size(max = 14)
    private String prcsTm;
    /** 요청자ID */
    @Size(max = 20)
    private String dmndUserId;
    /** 요청자IP */
    private String rqesterIp;
    /** 발생일자 */
    @Size(max = 8)
    private String ocrnYmd;

}
