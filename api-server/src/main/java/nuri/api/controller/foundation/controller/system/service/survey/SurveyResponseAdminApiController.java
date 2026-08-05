package nuri.api.controller.foundation.controller.system.service.survey;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.business.service.system.service.survey.SurveyResultService;
import nuri.business.service.system.service.survey.dto.SurveyResultDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.annotation.AdminOnly;
import nuri.foundation.security.annotation.AdminOrSystem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 설문 응답 관리 API (Admin) — 목록·단건·삭제.
 *
 * <p>경로를 {@code /survey-responses} 로 둔 이유: {@code SurveyApiController} 가
 * {@code /api/v1/admin/system/surveys} 에 {@code @GetMapping("/{srvyId}")} 를 갖고 있어,
 * {@code /surveys/responses} 로 두면 {@code srvyId="responses"} 패턴과 겹친다. Spring 은 리터럴을
 * 우선하므로 동작은 하지만, 읽는 사람에게 함정이라 경로 자체를 분리했다.
 *
 * <p><b>목록·조회는 {@code @AdminOrSystem}, 삭제만 {@code @AdminOnly}</b>.
 * 응답 내용에는 신상 정보가 없어(신상은 {@code tb_srvy_rspdnt} 쪽이다) 열람은 시스템 운영
 * 등급으로 충분하다. 그러나 <b>삭제는 되돌릴 수 없는 데이터 파괴</b>이고 설문 결과의 신뢰성에
 * 직결되므로 한 단계 좁힌다 — 열람과 파괴를 같은 등급에 두지 않는다.
 */
@Tag(name = "SurveyResponseAdmin", description = "설문 응답 관리 API (Admin)")
@RestController("surveyResponseAdminApiController")
@RequestMapping("/api/v1/admin/system/survey-responses")
@RequiredArgsConstructor
public class SurveyResponseAdminApiController {

    private final SurveyResultService surveyResultService;

    @Operation(summary = "설문 응답 목록", description = "응답자명 부분일치로 검색한다.")
    @AdminOrSystem
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SurveyResultDto>>> getResponses(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SurveyResultDto> page = surveyResultService.getResponseList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 응답 단건 조회")
    @AdminOrSystem
    @GetMapping("/{srvyRspnsId}")
    public ResponseEntity<ApiResponse<SurveyResultDto>> getResponse(@PathVariable String srvyRspnsId) {
        return ResponseEntity.ok(ApiResponse.success(surveyResultService.getResponse(srvyRspnsId)));
    }

    @Operation(summary = "설문 응답 삭제", description = "되돌릴 수 없다. ADMIN 만 수행할 수 있다.")
    @AdminOnly
    @DeleteMapping("/{srvyRspnsId}")
    public ResponseEntity<ApiResponse<Void>> deleteResponse(@PathVariable String srvyRspnsId) {
        surveyResultService.deleteResponse(srvyRspnsId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
