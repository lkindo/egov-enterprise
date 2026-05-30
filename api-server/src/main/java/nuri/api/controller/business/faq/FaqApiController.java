package nuri.api.controller.business.faq;

import nuri.business.service.faq.FaqService;
import nuri.business.service.faq.dto.FaqDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "FAQ", description = "FAQ 관리 API")
@RestController
@RequestMapping("/api/v1/faqs")
@RequiredArgsConstructor
public class FaqApiController {

    private final FaqService faqService;

    @Operation(summary = "FAQ 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FaqDto>>> getFaqList(
            @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPageIndex() - 1, searchDto.getPageUnit());
        Page<FaqDto> page = faqService.getFaqList(searchDto.getSearchKeyword(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "FAQ 상세 조회")
    @GetMapping("/{faqId}")
    public ResponseEntity<ApiResponse<FaqDto>> getFaq(@PathVariable String faqId) {
        faqService.increaseInqireCo(faqId);
        FaqDto result = faqService.getFaq(faqId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "FAQ 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createFaq(@RequestBody FaqDto dto) {
        String id = faqService.createFaq("SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "FAQ 수정")
    @PutMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> updateFaq(@PathVariable String faqId, @RequestBody FaqDto dto) {
        dto.setFaqId(faqId);
        faqService.updateFaq(faqId, "SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "FAQ 삭제")
    @DeleteMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> deleteFaq(@PathVariable String faqId) {
        faqService.deleteFaq(faqId, "SYSTEM");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
