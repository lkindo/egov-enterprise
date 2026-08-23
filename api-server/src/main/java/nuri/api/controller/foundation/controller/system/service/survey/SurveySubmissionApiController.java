package nuri.api.controller.foundation.controller.system.service.survey;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.service.survey.SurveyResultService;
import nuri.business.service.survey.dto.SurveyResponseSubmitDto;
import nuri.business.service.survey.dto.SurveyStatsDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.annotation.Authenticated;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 설문 참여 API — 응답 제출과 결과 통계.
 *
 * <p>[D-4 3단계] 종전에는 설문을 <b>만들 수는 있어도 답할 수는 없었다</b>.
 * {@code tb_srvy_rslt} 를 쓰는 계층이 통째로 없었고({@code SurveyService} 는 이 리포지토리를
 * 설문 삭제 시 연쇄 정리용으로만 주입), 프론트의 {@code /survey/stats}·{@code /survey/[id]} 는
 * 존재하지 않는 엔드포인트를 호출해 404 를 받고 있었다.
 *
 * <p><b>인가는 {@code @Authenticated}</b>. 설문 참여와 결과 열람은 관리 기능이 아니라 일반
 * 사용자의 행위다. 다만 익명 제출은 허용하지 않는다 — 이 테이블에는 응답자 사용자 ID 컬럼이
 * 없어 제출자 식별이 감사 컬럼({@code frst_rgtr_id}, {@code @CreatedBy})에만 의존하며,
 * 그 값이 없으면 중복 제출 차단도 성립하지 않는다.
 *
 * <p>응답 <b>목록·삭제</b>는 관리 기능이라 {@link SurveyResponseAdminApiController} 로 분리했다.
 */
@Tag(name = "SurveySubmission", description = "설문 응답 제출 및 결과 통계 API")
@RestController("surveySubmissionApiController")
@RequestMapping("/api/v1/surveys/{srvySn}")
@RequiredArgsConstructor
public class SurveySubmissionApiController {

    private final SurveyResultService surveyResultService;

    @Operation(summary = "설문 결과 통계",
            description = "문항 × 항목 단위의 평면 분포를 반환한다. 응답이 0건인 항목도 0% 행으로 포함한다.")
    @Authenticated
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<List<SurveyStatsDto>>> getStats(@PathVariable Long srvySn) {
        return ResponseEntity.ok(ApiResponse.success(surveyResultService.getStats(srvySn)));
    }

    @Operation(summary = "설문 응답 제출",
            description = "답변 N건이 응답 행 N개가 된다. 같은 사용자의 재제출은 거부한다.")
    @Authenticated
    @PostMapping("/responses")
    public ResponseEntity<ApiResponse<Integer>> submit(
            @PathVariable Long srvySn,
            @Valid @RequestBody SurveyResponseSubmitDto dto) {
        return ResponseEntity.ok(ApiResponse.success(surveyResultService.submitResponse(srvySn, dto)));
    }
}
