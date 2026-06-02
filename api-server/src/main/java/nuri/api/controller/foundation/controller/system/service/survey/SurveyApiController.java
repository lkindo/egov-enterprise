package nuri.api.controller.foundation.controller.system.service.survey;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.service.system.service.survey.EgovSurveyService;
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

    private final EgovSurveyService surveyService;

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
    @GetMapping("/templates/{tmpltId}")
    public ResponseEntity<ApiResponse<SurveyTemplateDto>> getTemplate(@PathVariable String tmpltId) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getTmplat(tmpltId)));
    }

    @Operation(summary = "설문 템플릿 등록")
    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<Void>> insertTemplate(@RequestBody SurveyTemplateDto dto) {
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
    @GetMapping("/{srvyId}")
    public ResponseEntity<ApiResponse<SurveyInfoDto>> getSurvey(@PathVariable String srvyId) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getSurvey(srvyId)));
    }

    @Operation(summary = "설문 정보 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertSurvey(@RequestBody SurveyInfoDto dto) {
        surveyService.insertSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 수정")
    @PutMapping("/{srvyId}")
    public ResponseEntity<ApiResponse<Void>> updateSurvey(@PathVariable String srvyId, @RequestBody SurveyInfoDto dto) {
        dto.setSrvyId(srvyId);
        surveyService.updateSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 삭제")
    @DeleteMapping("/{srvyId}")
    public ResponseEntity<ApiResponse<Void>> deleteSurvey(@PathVariable String srvyId) {
        surveyService.deleteSurvey(srvyId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 수정")
    @PutMapping("/templates/{tmpltId}")
    public ResponseEntity<ApiResponse<Void>> updateTemplate(@PathVariable String tmpltId, @RequestBody SurveyTemplateDto dto) {
        dto.setSrvyTmpltId(tmpltId);
        surveyService.updateTmplat(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 삭제")
    @DeleteMapping("/templates/{tmpltId}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable String tmpltId) {
        surveyService.deleteTmplat(tmpltId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Questions & Items ---

    @Operation(summary = "설문 문항 목록 조회")
    @GetMapping("/{srvyId}/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionDto>>> getQuestions(@PathVariable String srvyId) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getQuestionList(srvyId)));
    }

    @Operation(summary = "설문 문항 수정")
    @PutMapping("/{srvyId}/questions/{srvyQitemId}")
    public ResponseEntity<ApiResponse<Void>> updateQuestion(@PathVariable String srvyId, @PathVariable String srvyQitemId, @RequestBody SurveyQuestionDto dto) {
        dto.setSrvyId(srvyId);
        dto.setSrvyQstnId(srvyQitemId);
        surveyService.updateQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 삭제")
    @DeleteMapping("/{srvyId}/questions/{srvyQitemId}")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(@PathVariable String srvyQitemId) {
        surveyService.deleteQuestion(srvyQitemId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 등록")
    @PostMapping("/{srvyId}/questions")
    public ResponseEntity<ApiResponse<Void>> insertQuestion(@PathVariable String srvyId,
            @RequestBody SurveyQuestionDto dto) {
        dto.setSrvyId(srvyId);
        surveyService.insertQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 수정")
    @PutMapping("/questions/items/{srvyItemId}")
    public ResponseEntity<ApiResponse<Void>> updateItem(@PathVariable String srvyItemId, @RequestBody SurveyArticleDto dto) {
        dto.setSrvyArtclId(srvyItemId);
        surveyService.updateItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 삭제")
    @DeleteMapping("/questions/items/{srvyItemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable String srvyItemId) {
        surveyService.deleteItem(srvyItemId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 등록")
    @PostMapping("/questions/{srvyQitemId}/items")
    public ResponseEntity<ApiResponse<Void>> insertItem(@PathVariable String srvyQitemId, @RequestBody SurveyArticleDto dto) {
        dto.setSrvyQstnId(srvyQitemId);
        surveyService.insertItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
