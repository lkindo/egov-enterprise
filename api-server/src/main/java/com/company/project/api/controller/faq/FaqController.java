package com.company.project.api.controller.faq;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.faq.EgovFaqService;
import com.company.project.service.faq.dto.FaqDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Faq", description = "FAQ Management APIs")
@RestController
@RequestMapping("/api/v1/faqs")
@RequiredArgsConstructor
public class FaqController {

    private final EgovFaqService faqService;

    @Operation(summary = "FAQ 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<FaqDto>>> getFaqs(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(faqService.getFaqList(keyword, pageable)));
    }

    @Operation(summary = "FAQ 상세 조회")
    @GetMapping("/{faqId}")
    public ResponseEntity<ApiResponse<FaqDto>> getFaq(
            @Parameter(description = "FAQ ID") @PathVariable String faqId) {
        return ResponseEntity.ok(ApiResponse.success(faqService.getFaq(faqId)));
    }

    @Operation(summary = "FAQ 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertFaq(@RequestBody FaqDto dto) {
        faqService.insertFaq(null, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "FAQ 수정")
    @PutMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> updateFaq(
            @PathVariable String faqId,
            @RequestBody FaqDto dto) {
        faqService.updateFaq(faqId, null, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "FAQ 삭제")
    @DeleteMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> deleteFaq(
            @PathVariable String faqId) {
        faqService.deleteFaq(faqId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
