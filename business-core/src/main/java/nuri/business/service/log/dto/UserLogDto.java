package nuri.business.service.log.dto;

import lombok.Builder;
import nuri.business.domain.log.UserLog;

/**
 * 사용자 활동 로그 DTO — 조회 전용.
 *
 * <p>이 테이블은 개별 요청 기록이 아니라 <b>사용자 × 서비스 × 메서드 × 일자 단위 집계</b>다
 * (복합키 {@code @IdClass(UserLogId)}). 그래서 값의 본체는 식별자가 아니라 <b>행위 카운터 6종</b>이다.
 *
 * <p><b>⚠ 프론트 수제 타입이 엔티티와 어긋나 있었다(2026-08-05 실측).</b>
 * {@code types/foundation/system.ts} 의 {@code UserLog} 는 {@code occrrncDe}·{@code rqesterId}·
 * {@code svcNm}·{@code methodNm}·{@code creatDt}·{@code userLogId} 를 선언했는데,
 * 실제 컬럼은 {@code ocrn_ymd}·{@code dmnd_user_id}·{@code srvc_nm}·{@code mthd_nm} 이고
 * <b>{@code creatDt}(등록일시)와 단일 {@code userLogId} 는 아예 없다</b>(복합키다).
 * 화면은 없는 컬럼을 그리고 있었고, 정작 이 테이블의 값인 카운터 6종은 그리지 않았다.
 * 이 DTO 는 <b>엔티티 실물</b>을 기준으로 삼고 프론트 타입·화면을 여기 맞춘다.
 *
 * <p>{@code userNm} 은 {@code vnUserMaster} 연관에서 온다 — 검색 술어
 * ({@code UserLogRepositoryImpl})가 사용자<b>명</b>으로 조인 검색하므로 결과에도 함께 싣는다.
 * 지연 로딩이라 연관이 없으면 null 이다(사용자가 삭제된 과거 로그).
 */
@Builder
public record UserLogDto(
        /** 발생일자 (yyyyMMdd) — 복합키 */
        String ocrnYmd,
        /** 요청자 ID (esntlId) — 복합키 */
        String dmndUserId,
        /** 요청자명 (연관에서 조회. 사용자가 삭제됐으면 null) */
        String userNm,
        /** 서비스명 — 복합키 */
        String srvcNm,
        /** 메서드명 — 복합키 */
        String mthdNm,
        /** 생성 건수 */
        Integer crtCnt,
        /** 수정 건수 */
        Integer mdfcnCnt,
        /** 조회 건수 */
        Integer inqCnt,
        /** 삭제 건수 */
        Integer delCnt,
        /** 출력 건수 */
        Integer otptCnt,
        /** 오류 건수 */
        Integer errCnt
) {

    /** 엔티티 → DTO. 조회 전용이라 역방향은 두지 않는다. */
    public static UserLogDto from(UserLog entity) {
        return UserLogDto.builder()
                .ocrnYmd(entity.getOcrnYmd())
                .dmndUserId(entity.getDmndUserId())
                .userNm(entity.getVnUserMaster() != null ? entity.getVnUserMaster().getUserNm() : null)
                .srvcNm(entity.getSrvcNm())
                .mthdNm(entity.getMthdNm())
                .crtCnt(entity.getCrtCnt())
                .mdfcnCnt(entity.getMdfcnCnt())
                .inqCnt(entity.getInqCnt())
                .delCnt(entity.getDelCnt())
                .otptCnt(entity.getOtptCnt())
                .errCnt(entity.getErrCnt())
                .build();
    }
}
