package com.company.project.api.controller.system.service.qna;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.system.service.qna.EgovQnaService;
import com.company.project.service.system.service.qna.dto.QnaDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Qna", description = "Q&A 관리 API (Admin)")
@RestController("systemQnaApiController")
@RequestMapping("/api/v1/admin/system/qnas")
@RequiredArgsConstructor
public class QnaApiController {

    private final EgovQnaService qnaService;

    @Operation(summary = "Q&A 목록 조회", description = "Q&A 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<QnaDto>>> getQnas(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<QnaDto> result = qnaService.getQnaList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "Q&A 상세 조회", description = "Q&A 상세 정보를 조회합니다.")
    @GetMapping("/{qaId}")
    public ResponseEntity<ApiResponse<QnaDto>> getQna(
            @Parameter(description = "Q&A ID") @PathVariable String qaId) {
        return ResponseEntity.ok(ApiResponse.success(qnaService.getQna(qaId)));
    }

    @Operation(summary = "Q&A 질문 등록", description = "새로운 Q&A 질문을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> insertQna(@RequestBody QnaDto dto) {
        String id = qnaService.createQna("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "Q&A 질문 수정", description = "기존 Q&A 질문을 수정합니다.")
    @PutMapping("/{qaId}")
    public ResponseEntity<ApiResponse<Void>> updateQna(
            @PathVariable String qaId,
            @RequestBody QnaDto dto) {
        qnaService.updateQna(qaId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Q&A 답변 등록/수정", description = "Q&A 에 대한 답변을 등록하거나 수정합니다.")
    @PatchMapping("/{qaId}/answer")
    public ResponseEntity<ApiResponse<Void>> answerQna(
            @PathVariable String qaId,
            @RequestBody String answerCn) {
        qnaService.updateAnswer(qaId, "ADMIN", answerCn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Q&A 삭제", description = "Q&A 정보를 삭제합니다.")
    @DeleteMapping("/{qaId}")
    public ResponseEntity<ApiResponse<Void>> deleteQna(@PathVariable String qaId) {
        qnaService.deleteQna(qaId, "ADMIN");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
