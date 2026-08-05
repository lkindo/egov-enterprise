package nuri.business.service.log.dto;

import lombok.Builder;
import nuri.business.domain.log.PrivacyLog;

import java.time.LocalDateTime;

/**
 * 개인정보 조회 로그 DTO — 조회 전용.
 *
 * <p>"누가 언제 어떤 개인정보를 열람했는가" 를 남기는 <b>컴플라이언스 증적</b>이다.
 * 그래서 이 DTO 에는 쓰기 필드도, 엔티티 역변환도 두지 않는다 — 증적은 시스템이 적재하고
 * 사람은 읽기만 한다.
 *
 * <p><b>⚠ 이 로그 자체가 개인정보다.</b> {@code inqInfo}(조회 대상 정보) · {@code dmndUserId}
 * (조회자) · {@code dmndUserIpAddr}(조회자 IP)가 모두 식별 가능한 값이라, 열람 권한을
 * {@code @AdminOnly}(ADMIN 전용)로 좁혔다 — 다른 로그 화면이 쓰는 {@code @AdminOrSystem} 보다
 * 한 단계 좁다(SYSTEM 롤 제외). "개인정보 접근 기록을 누가 볼 수 있는가" 는 그 자체로
 * 개인정보 이슈이기 때문이다(2026-08-05 사용자 결정).
 */
@Builder
public record PrivacyLogDto(
        /** 요청 ID (PK) */
        String dmndId,
        /** 조회 일시 */
        LocalDateTime inqDt,
        /** 서비스명 */
        String srvcNm,
        /** 조회 대상 정보 */
        String inqInfo,
        /** 조회자 ID */
        String dmndUserId,
        /** 조회자 IP */
        String dmndUserIpAddr
) {

    /** 엔티티 → DTO. 조회 전용이라 역방향은 두지 않는다. */
    public static PrivacyLogDto from(PrivacyLog entity) {
        return PrivacyLogDto.builder()
                .dmndId(entity.getDmndId())
                .inqDt(entity.getInqDt())
                .srvcNm(entity.getSrvcNm())
                .inqInfo(entity.getInqInfo())
                .dmndUserId(entity.getDmndUserId())
                .dmndUserIpAddr(entity.getDmndUserIpAddr())
                .build();
    }
}
