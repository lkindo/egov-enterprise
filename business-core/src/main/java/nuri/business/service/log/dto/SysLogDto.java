package nuri.business.service.log.dto;

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
    /** 시스템 로그 내부 일련번호 */
    private Long sysLogSn;
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

    // [2026-09-02] 아래 세 필드는 엔티티·DDL 에는 있었지만 DTO 에 없어 **어느 화면도 못 읽었다**.
    //   SystemErrorLogListener 가 4xx+ 요청을 기록하기 시작하면서 rspnsCd·errSeCd 를 쓰는데,
    //   읽는 쪽이 없으면 "실패 로그" 화면이 정작 무엇이 실패했는지 보여 주지 못한다.
    /** HTTP 응답 상태 코드(예: 404·500). 실패 로그에만 채워진다. */
    @Size(max = 12)
    private String rspnsCd;
    /** 오류 구분 — CLIENT(4xx) / SERVER(5xx). */
    @Size(max = 12)
    private String errSeCd;
    /** 애플리케이션 오류 코드. 인터셉터 계층에는 없어 현재 비어 있다 — 지어내지 않는다. */
    @Size(max = 12)
    private String errCd;

}
