package com.company.project.api.controller.faq;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.faq.FaqService;
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

@Tag(name = "FAQ", description = "FAQ 관리 API")
@RestController
@RequestMapping("/api/v1/faqs")
@RequiredArgsConstructor
public class FaqApiController {

    private final FaqService faqService;

    @Operation(summary = "FAQ 목록 조회", description = "FAQ 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FaqDto>>> getFaqs(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<FaqDto> result = faqService.getFaqList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "FAQ 상세 조회", description = "특정 FAQ의 상세 정보를 조회합니다.")
    @GetMapping("/{faqId}")
    public ResponseEntity<ApiResponse<FaqDto>> getFaq(
            @Parameter(description = "FAQ ID") @PathVariable String faqId) {
        return ResponseEntity.ok(ApiResponse.success(faqService.getFaq(faqId)));
    }

    @Operation(summary = "FAQ 등록", description = "새로운 FAQ를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> insertFaq(@RequestBody FaqDto dto) {
        String id = faqService.createFaq("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "FAQ 정보 수정", description = "기존 FAQ 정보를 수정합니다.")
    @PutMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> updateFaq(
            @PathVariable String faqId,
            @RequestBody FaqDto dto) {
        faqService.updateFaq(faqId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "FAQ 삭제", description = "FAQ 정보를 삭제합니다.")
    @DeleteMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> deleteFaq(@PathVariable String faqId) {
        faqService.deleteFaq(faqId, "ADMIN");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
