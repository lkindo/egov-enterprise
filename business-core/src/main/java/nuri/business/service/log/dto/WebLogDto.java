package nuri.business.service.log.dto;

import lombok.Builder;
import nuri.business.domain.log.WebLog;

/**
 * 웹 로그 DTO — 조회 전용.
 *
 * <p>이 도메인은 {@code WebAuditLogListener} 가 요청마다 적재하기만 하고 <b>읽는 경로가 없었다</b>
 * (라이브 실측 2026-08-05: {@code tb_web_log} 28,104행, 조회 API 0건). 관리 화면
 * {@code /admin/system/logs/web} 은 이미 존재했고 {@code systemLogAdminService.getWebLogs()} 를
 * 호출하고 있었으나 대응 엔드포인트가 없었다 — 그 간극을 잇는다.
 *
 * <p><b>쓰기 필드를 두지 않는다.</b> 로그는 시스템이 적재하는 것이지 관리자가 편집하는 것이 아니다.
 * {@code record} 로 선언해 불변으로 고정한다.
 */
@Builder
public record WebLogDto(
        /** 웹 로그 내부 일련번호 */
        Long webLogSn,
        /** 요청 URL */
        String url,
        /** 요청자 ID */
        String dmndUserId,
        /** 요청자 IP */
        String dmndUserIpAddr,
        /** 발생일자 (yyyyMMdd) */
        String occrYmd,
        /** 처리시간(ms) */
        Long prcsTm
) {

    /** 엔티티 → DTO. 조회 전용이라 역방향(DTO → 엔티티)은 두지 않는다. */
    public static WebLogDto from(WebLog entity) {
        return WebLogDto.builder()
                .webLogSn(entity.getWebLogSn())
                .url(entity.getUrl())
                .dmndUserId(entity.getDmndUserId())
                .dmndUserIpAddr(entity.getDmndUserIpAddr())
                .occrYmd(entity.getOccrYmd())
                .prcsTm(entity.getPrcsTm())
                .build();
    }
}
