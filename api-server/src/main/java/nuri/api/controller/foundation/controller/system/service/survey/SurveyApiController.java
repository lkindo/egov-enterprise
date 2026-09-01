package nuri.api.controller.foundation.controller.system.service.survey;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.annotation.AdminOrSystem;
import nuri.foundation.security.annotation.Authenticated;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.survey.SurveyService;
import nuri.business.service.survey.dto.SurveyInfoDto;
import nuri.business.service.survey.dto.SurveyTemplateDto;
import nuri.business.service.survey.dto.SurveyArticleDto;
import nuri.business.service.survey.dto.SurveyQuestionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 설문 관리 + 일반 열람 API.
 *
 * <p>[2026-08-20 제품 결정 — 설문 제출 일반 개방] 종전에는 이 컨트롤러에 메서드 인가가 전혀 없었고
 * 별칭 경로({@code /api/v1/surveys/**})의 URL 게이트(secure-paths → ADMIN/SYSTEM)에만 의존했다.
 * 그래서 {@code SurveySubmissionApiController} 의 {@code @Authenticated} 제출 엔드포인트가
 * 핸들러에 도달하기 전에 403 으로 죽었다 — 애노테이션 의미와 실행 의미가 어긋난 상태(GAP-AUTH-001).
 *
 * <p>제품 결정에 따라 별칭 URL 게이트를 제거(V2_84 + secure-paths 3개 선언)하고, 인가를
 * <b>메서드 레벨로 명시</b>한다:
 * <ul>
 *   <li>{@code @Authenticated}: 목록·상세·문항 조회 — 일반 사용자가 설문에 응답하기 위한 최소 읽기 집합</li>
 *   <li>{@code @AdminOrSystem}: 템플릿 전체와 설문·문항·항목의 생성/수정/삭제 — 관리 기능</li>
 * </ul>
 * 정식 관리 경로({@code /api/v1/admin/system/surveys/**})의 URL 게이트는 그대로라 관리 UI 는
 * 이중(URL+메서드) 방어를 유지하며, 별칭 경로는 메서드 인가가 단독 방어선이므로
 * <b>여기서 애노테이션을 지우는 것은 인가 제거</b>다(SecurityAuthAnnotationLinterTest 가 동결).
 */
@Tag(name = "Survey", description = "설문 관리 API (관리는 ADMIN/SYSTEM, 열람은 인증 사용자)")
@RestController("systemSurveyApiController")
@RequestMapping({"/api/v1/admin/system/surveys", "/api/v1/surveys"})
@RequiredArgsConstructor
public class SurveyApiController {

    private final SurveyService surveyService;

    // --- Templates ---

    @Operation(summary = "설문 템플릿 목록 페이징 조회")
    @AdminOrSystem
    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<PageResponse<SurveyTemplateDto>>> getTemplates(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SurveyTemplateDto> page = surveyService.getTmplatList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 템플릿 상세 조회")
    @AdminOrSystem
    @GetMapping("/templates/{srvyTmpltSn}")
    public ResponseEntity<ApiResponse<SurveyTemplateDto>> getTemplate(@PathVariable Long srvyTmpltSn) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getTmplat(srvyTmpltSn)));
    }

    @Operation(summary = "설문 템플릿 등록")
    @AdminOrSystem
    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<Void>> insertTemplate(@Valid @RequestBody SurveyTemplateDto dto) {
        surveyService.insertTmplat(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Survey Info ---

    @Operation(summary = "설문 정보 목록 페이징 조회")
    @Authenticated
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SurveyInfoDto>>> getSurveys(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SurveyInfoDto> page = surveyService.getSurveyList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 정보 상세 조회")
    @Authenticated
    @GetMapping("/{srvySn}")
    public ResponseEntity<ApiResponse<SurveyInfoDto>> getSurvey(@PathVariable Long srvySn) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getSurvey(srvySn)));
    }

    @Operation(summary = "설문 정보 등록")
    @AdminOrSystem
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertSurvey(@Valid @RequestBody SurveyInfoDto dto) {
        surveyService.insertSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 수정")
    @AdminOrSystem
    @PutMapping("/{srvySn}")
    public ResponseEntity<ApiResponse<Void>> updateSurvey(@PathVariable Long srvySn, @Valid @RequestBody SurveyInfoDto dto) {
        dto.setSrvySn(srvySn);
        surveyService.updateSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 삭제")
    @AdminOrSystem
    @DeleteMapping("/{srvySn}")
    public ResponseEntity<ApiResponse<Void>> deleteSurvey(@PathVariable Long srvySn) {
        surveyService.deleteSurvey(srvySn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 수정")
    @AdminOrSystem
    @PutMapping("/templates/{srvyTmpltSn}")
    public ResponseEntity<ApiResponse<Void>> updateTemplate(@PathVariable Long srvyTmpltSn, @Valid @RequestBody SurveyTemplateDto dto) {
        dto.setSrvyTmpltSn(srvyTmpltSn);
        surveyService.updateTmplat(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 삭제")
    @AdminOrSystem
    @DeleteMapping("/templates/{srvyTmpltSn}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long srvyTmpltSn) {
        surveyService.deleteTmplat(srvyTmpltSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Questions & Items ---

    @Operation(summary = "설문 문항 목록 조회")
    @Authenticated
    @GetMapping("/{srvySn}/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionDto>>> getQuestions(@PathVariable Long srvySn) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getQuestionList(srvySn)));
    }

    @Operation(summary = "설문 문항 수정")
    @AdminOrSystem
    @PutMapping("/{srvySn}/questions/{srvyQstnSn}")
    public ResponseEntity<ApiResponse<Void>> updateQuestion(@PathVariable Long srvySn, @PathVariable Long srvyQstnSn, @Valid @RequestBody SurveyQuestionDto dto) {
        dto.setSrvySn(srvySn);
        dto.setSrvyQstnSn(srvyQstnSn);
        surveyService.updateQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 삭제")
    @AdminOrSystem
    @DeleteMapping("/{srvySn}/questions/{srvyQstnSn}")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(
            @PathVariable Long srvySn,
            @PathVariable Long srvyQstnSn) {
        surveyService.deleteQuestion(srvySn, srvyQstnSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 등록")
    @AdminOrSystem
    @PostMapping("/{srvySn}/questions")
    public ResponseEntity<ApiResponse<Void>> insertQuestion(@PathVariable Long srvySn,
            @Valid @RequestBody SurveyQuestionDto dto) {
        dto.setSrvySn(srvySn);
        surveyService.insertQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 수정")
    @AdminOrSystem
    @PutMapping("/questions/items/{srvyArtclSn}")
    public ResponseEntity<ApiResponse<Void>> updateItem(@PathVariable Long srvyArtclSn, @Valid @RequestBody SurveyArticleDto dto) {
        dto.setSrvyArtclSn(srvyArtclSn);
        surveyService.updateItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 삭제")
    @AdminOrSystem
    @DeleteMapping("/questions/items/{srvyArtclSn}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable Long srvyArtclSn) {
        surveyService.deleteItem(srvyArtclSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 등록")
    @AdminOrSystem
    @PostMapping("/questions/{srvyQstnSn}/items")
    public ResponseEntity<ApiResponse<Void>> insertItem(@PathVariable Long srvyQstnSn, @Valid @RequestBody SurveyArticleDto dto) {
        dto.setSrvyQstnSn(srvyQstnSn);
        surveyService.insertItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
