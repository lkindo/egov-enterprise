package nuri.api.controller.foundation.controller.system.service.survey;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.system.service.survey.SurveyService;
import nuri.business.service.system.service.survey.dto.SurveyInfoDto;
import nuri.business.service.system.service.survey.dto.SurveyTemplateDto;
import nuri.business.service.system.service.survey.dto.SurveyArticleDto;
import nuri.business.service.system.service.survey.dto.SurveyQuestionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Survey", description = "설문 관리 API (Admin)")
@RestController("systemSurveyApiController")
@RequestMapping({"/api/v1/admin/system/surveys", "/api/v1/surveys"})
@RequiredArgsConstructor
public class SurveyApiController {

    private final SurveyService surveyService;

    // --- Templates ---

    @Operation(summary = "설문 템플릿 목록 페이징 조회")
    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<PageResponse<SurveyTemplateDto>>> getTemplates(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SurveyTemplateDto> page = surveyService.getTmplatList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 템플릿 상세 조회")
    @GetMapping("/templates/{srvyTmpltSn}")
    public ResponseEntity<ApiResponse<SurveyTemplateDto>> getTemplate(@PathVariable Long srvyTmpltSn) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getTmplat(srvyTmpltSn)));
    }

    @Operation(summary = "설문 템플릿 등록")
    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<Void>> insertTemplate(@Valid @RequestBody SurveyTemplateDto dto) {
        surveyService.insertTmplat(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Survey Info ---

    @Operation(summary = "설문 정보 목록 페이징 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SurveyInfoDto>>> getSurveys(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SurveyInfoDto> page = surveyService.getSurveyList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 정보 상세 조회")
    @GetMapping("/{srvySn}")
    public ResponseEntity<ApiResponse<SurveyInfoDto>> getSurvey(@PathVariable Long srvySn) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getSurvey(srvySn)));
    }

    @Operation(summary = "설문 정보 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertSurvey(@Valid @RequestBody SurveyInfoDto dto) {
        surveyService.insertSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 수정")
    @PutMapping("/{srvySn}")
    public ResponseEntity<ApiResponse<Void>> updateSurvey(@PathVariable Long srvySn, @Valid @RequestBody SurveyInfoDto dto) {
        dto.setSrvySn(srvySn);
        surveyService.updateSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 삭제")
    @DeleteMapping("/{srvySn}")
    public ResponseEntity<ApiResponse<Void>> deleteSurvey(@PathVariable Long srvySn) {
        surveyService.deleteSurvey(srvySn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 수정")
    @PutMapping("/templates/{srvyTmpltSn}")
    public ResponseEntity<ApiResponse<Void>> updateTemplate(@PathVariable Long srvyTmpltSn, @Valid @RequestBody SurveyTemplateDto dto) {
        dto.setSrvyTmpltSn(srvyTmpltSn);
        surveyService.updateTmplat(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 삭제")
    @DeleteMapping("/templates/{srvyTmpltSn}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long srvyTmpltSn) {
        surveyService.deleteTmplat(srvyTmpltSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Questions & Items ---

    @Operation(summary = "설문 문항 목록 조회")
    @GetMapping("/{srvySn}/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionDto>>> getQuestions(@PathVariable Long srvySn) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getQuestionList(srvySn)));
    }

    @Operation(summary = "설문 문항 수정")
    @PutMapping("/{srvySn}/questions/{srvyQstnSn}")
    public ResponseEntity<ApiResponse<Void>> updateQuestion(@PathVariable Long srvySn, @PathVariable Long srvyQstnSn, @Valid @RequestBody SurveyQuestionDto dto) {
        dto.setSrvySn(srvySn);
        dto.setSrvyQstnSn(srvyQstnSn);
        surveyService.updateQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 삭제")
    @DeleteMapping("/{srvySn}/questions/{srvyQstnSn}")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(@PathVariable Long srvyQstnSn) {
        surveyService.deleteQuestion(srvyQstnSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 등록")
    @PostMapping("/{srvySn}/questions")
    public ResponseEntity<ApiResponse<Void>> insertQuestion(@PathVariable Long srvySn,
            @Valid @RequestBody SurveyQuestionDto dto) {
        dto.setSrvySn(srvySn);
        surveyService.insertQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 수정")
    @PutMapping("/questions/items/{srvyArtclSn}")
    public ResponseEntity<ApiResponse<Void>> updateItem(@PathVariable Long srvyArtclSn, @Valid @RequestBody SurveyArticleDto dto) {
        dto.setSrvyArtclSn(srvyArtclSn);
        surveyService.updateItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 삭제")
    @DeleteMapping("/questions/items/{srvyArtclSn}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable Long srvyArtclSn) {
        surveyService.deleteItem(srvyArtclSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 등록")
    @PostMapping("/questions/{srvyQstnSn}/items")
    public ResponseEntity<ApiResponse<Void>> insertItem(@PathVariable Long srvyQstnSn, @Valid @RequestBody SurveyArticleDto dto) {
        dto.setSrvyQstnSn(srvyQstnSn);
        surveyService.insertItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
