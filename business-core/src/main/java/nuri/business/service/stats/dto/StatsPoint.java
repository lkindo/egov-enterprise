package nuri.business.service.stats.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 일자별 집계 한 칸. 통계의 모든 시계열이 이 모양 하나로 나간다.
 *
 * <p>[2026-10-20] 종전에는 계열마다 날짜 형식이 달랐다 — 접속은 {@code yyyy-MM-dd}, 사용자 활동은 저장 형식
 * {@code yyyyMMdd}, 게시물은 {@code yyyy-MM-dd} 최신순이었고, 화면이 정렬·형식을 고쳐 그렸다. 이제 서버
 * ({@code ReportStatsService})가 형식·순서·빈 날 채우기를 한 곳에서 정하고, 화면은 받은 순서 그대로 그린다.
 *
 * @param date  집계 일자({@code yyyy-MM-dd}). 한 응답 안에서 오름차순이다
 * @param value 그날의 건수. 측정하는 계열에서 기록이 없는 날은 0 이다
 */
/*
 * 두 항목을 required 로 명시한다 — 서버는 언제나 둘 다 싣는다. 명시하지 않으면 생성 타입이 optional 이 되고
 * 소비자가 `?? 0` 으로 메워 "세지 않은 것" 과 "0" 이 화면에서 같아진다(DEC-OPS-100).
 */
@Schema(description = "일자별 집계 한 칸")
public record StatsPoint(
        @Schema(description = "집계 일자(yyyy-MM-dd). 한 응답 안에서 오름차순이다", example = "2026-10-01",
                requiredMode = Schema.RequiredMode.REQUIRED)
        String date,
        @Schema(description = "그날의 건수. 측정하는 계열에서 기록이 없는 날은 0 이다", example = "3",
                requiredMode = Schema.RequiredMode.REQUIRED)
        long value) {
}
