package nuri.api.controller.business.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 게시글 만족도 평균 응답.
 *
 * <p><b>[2026-08-29] 왜 nullable 인가</b> — 종전 이 응답은 {@code Map.of("average", avg == null ? 0.0 : avg)}
 * 였다. {@code Map.of} 는 null 값을 담으면 NPE 라, 평가가 하나도 없는 경우(서비스가 {@code null} 반환)를
 * <b>0.0 으로 뭉갤 수밖에 없었다</b>. 그래서 "아무도 평가하지 않은 게시글" 과 "모두가 최하점을 준
 * 게시글" 이 화면에서 똑같이 별 0개·0.0 으로 보였다.
 *
 * <p>같은 핸들러의 {@code @Operation} 설명은 이미 "응답이 없으면 null 이다 — 0 과 구분해야 한다" 라고
 * <b>정반대를 약속</b>하고 있었고, 컨트롤러 테스트는 그 결함을 "null 직렬화 회피" 라는 이름으로
 * 계약에 고정하고 있었다. record 는 null 을 그대로 실어 나르므로 제약 자체가 사라진다.
 */
public record SatisfactionAverageResponse(
        @Schema(description = "만족도 평균(1~5). 평가가 하나도 없으면 null 이며 0 과 구분해야 한다.",
                nullable = true, example = "4.5")
        Double average) {

    public static SatisfactionAverageResponse of(Double average) {
        return new SatisfactionAverageResponse(average);
    }
}
