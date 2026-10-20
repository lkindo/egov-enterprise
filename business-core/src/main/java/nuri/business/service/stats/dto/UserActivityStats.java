package nuri.business.service.stats.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * 일자별 사용자 활동 — 요청 구분(조회·등록·수정·삭제)마다 한 계열.
 *
 * <p>[2026-10-20] 종전에는 집계 질의가 조회 수까지 가져오고도 등록 요청 수 하나만 화면에 실었다(OCI 실측 조회 5,720 ·
 * 등록 31). 같은 질의에서 네 계열을 함께 내고 화면이 계열을 고른다. 구분은 {@code ProcessTypeCode} 의 HTTP 메서드
 * 매핑이다 — GET·HEAD 조회, POST 등록, PUT·PATCH 수정, DELETE 삭제. 실패한 요청도 그 구분에 센다.
 *
 * <p>네 계열은 같은 날짜 축이다(같은 기간, 같은 빈 날 채우기). 이름은 {@code tb_user_log} 컬럼의 표준 용어를 따른다.
 *
 * @param inqCnt   조회 요청 수({@code inq_cnt})
 * @param crtCnt   등록 요청 수({@code crt_cnt})
 * @param mdfcnCnt 수정 요청 수({@code mdfcn_cnt})
 * @param delCnt   삭제 요청 수({@code del_cnt})
 */
@Schema(description = "일자별 사용자 활동(요청 구분별 계열)")
public record UserActivityStats(
        @Schema(description = "조회 요청 수(GET·HEAD)", requiredMode = Schema.RequiredMode.REQUIRED)
        List<StatsPoint> inqCnt,
        @Schema(description = "등록 요청 수(POST)", requiredMode = Schema.RequiredMode.REQUIRED)
        List<StatsPoint> crtCnt,
        @Schema(description = "수정 요청 수(PUT·PATCH)", requiredMode = Schema.RequiredMode.REQUIRED)
        List<StatsPoint> mdfcnCnt,
        @Schema(description = "삭제 요청 수(DELETE)", requiredMode = Schema.RequiredMode.REQUIRED)
        List<StatsPoint> delCnt) {
}
