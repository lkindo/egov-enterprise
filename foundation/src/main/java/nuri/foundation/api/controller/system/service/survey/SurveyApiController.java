package nuri.foundation.api.controller.system.service.survey;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.service.system.service.survey.EgovSurveyService;
import nuri.foundation.service.system.service.survey.dto.QestnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QestnrTmplatDto;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
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
    public ResponseEntity<ApiResponse<PageResponse<QestnrTmplatDto>>> getTemplates(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<QestnrTmplatDto> page = surveyService.getTmplatList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 템플릿 상세 조회")
    @GetMapping("/templates/{tmplatId}")
    public ResponseEntity<ApiResponse<QestnrTmplatDto>> getTemplate(@PathVariable String tmplatId) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getTmplat(tmplatId)));
    }

    @Operation(summary = "설문 템플릿 등록")
    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<Void>> insertTemplate(@RequestBody QestnrTmplatDto dto) {
        surveyService.insertTmplat(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Survey Info ---

    @Operation(summary = "설문 정보 목록 페이징 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<QestnrInfoDto>>> getSurveys(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<QestnrInfoDto> page = surveyService.getSurveyList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 정보 상세 조회")
    @GetMapping("/{qestnrId}")
    public ResponseEntity<ApiResponse<QestnrInfoDto>> getSurvey(@PathVariable String qestnrId) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getSurvey(qestnrId)));
    }

    @Operation(summary = "설문 정보 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertSurvey(@RequestBody QestnrInfoDto dto) {
        surveyService.insertSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 수정")
    @PutMapping("/{qestnrId}")
    public ResponseEntity<ApiResponse<Void>> updateSurvey(@PathVariable String qestnrId, @RequestBody QestnrInfoDto dto) {
        dto.setQestnrId(qestnrId);
        surveyService.updateSurvey(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 정보 삭제")
    @DeleteMapping("/{qestnrId}")
    public ResponseEntity<ApiResponse<Void>> deleteSurvey(@PathVariable String qestnrId) {
        surveyService.deleteSurvey(qestnrId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 수정")
    @PutMapping("/templates/{tmplatId}")
    public ResponseEntity<ApiResponse<Void>> updateTemplate(@PathVariable String tmplatId, @RequestBody QestnrTmplatDto dto) {
        dto.setQestnrTmplatId(tmplatId);
        surveyService.updateTmplat(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 템플릿 삭제")
    @DeleteMapping("/templates/{tmplatId}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable String tmplatId) {
        surveyService.deleteTmplat(tmplatId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- Questions & Items ---

    @Operation(summary = "설문 문항 목록 조회")
    @GetMapping("/{qestnrId}/questions")
    public ResponseEntity<ApiResponse<List<QustnrQesitmDto>>> getQuestions(@PathVariable String qestnrId) {
        return ResponseEntity.ok(ApiResponse.success(surveyService.getQuestionList(qestnrId)));
    }

    @Operation(summary = "설문 문항 수정")
    @PutMapping("/{qestnrId}/questions/{qesitmId}")
    public ResponseEntity<ApiResponse<Void>> updateQuestion(@PathVariable String qestnrId, @PathVariable String qesitmId, @RequestBody QustnrQesitmDto dto) {
        dto.setQestnrId(qestnrId);
        dto.setQestnrQesitmId(qesitmId);
        surveyService.updateQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 삭제")
    @DeleteMapping("/{qestnrId}/questions/{qesitmId}")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(@PathVariable String qesitmId) {
        surveyService.deleteQuestion(qesitmId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 문항 등록")
    @PostMapping("/{qestnrId}/questions")
    public ResponseEntity<ApiResponse<Void>> insertQuestion(@PathVariable String qestnrId,
            @RequestBody QustnrQesitmDto dto) {
        dto.setQestnrId(qestnrId);
        surveyService.insertQuestion(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 수정")
    @PutMapping("/questions/items/{iemId}")
    public ResponseEntity<ApiResponse<Void>> updateItem(@PathVariable String iemId, @RequestBody QustnrIemDto dto) {
        dto.setQustnrIemId(iemId);
        surveyService.updateItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 삭제")
    @DeleteMapping("/questions/items/{iemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable String iemId) {
        surveyService.deleteItem(iemId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 등록")
    @PostMapping("/questions/{qesitmId}/items")
    public ResponseEntity<ApiResponse<Void>> insertItem(@PathVariable String qesitmId, @RequestBody QustnrIemDto dto) {
        dto.setQestnrQesitmId(qesitmId);
        surveyService.insertItem(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
