package nuri.api.controller.business.faq;

import jakarta.validation.Valid;
import nuri.business.service.faq.FaqService;
import nuri.business.service.faq.dto.FaqDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.foundation.security.annotation.AdminOrSystem;
import nuri.foundation.security.annotation.Authenticated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * FAQ 관리 API.
 *
 * <p><b>[2026-08-05 인가 부착]</b> 종전에는 엔드포인트 5개에 인가 애노테이션이 <b>하나도 없었고</b>,
 * 쓰기 3개(등록·수정·삭제)가 {@code rbac.db-auth.secure-paths} 의 URL 인가에만 얹혀 있었다.
 * URL 인가는 목록 한 줄이 빠지면 함께 사라지는 단일 실패점이라, 메서드 레벨 인가를 병기한다
 * (백엔드 헌법 제8조 이중 검증). 읽기는 {@code @Authenticated}, 쓰기는 {@code @AdminOrSystem} 이다.
 *
 * <p><b>⚠ 이번 범위에 넣지 않은 결함 — 행위자 하드코딩</b><br/>
 * 쓰기 3개가 행위자를 리터럴 {@code "SYSTEM"} 으로 넘긴다({@code faqService.createFaq("SYSTEM", …)}).
 * 그 값은 {@code FaqDto → setLastMdfrId(userId)} 로 감사 컬럼에 그대로 들어가므로,
 * <b>어떤 관리자가 고쳤는지가 기록되지 않는다.</b>
 *
 * <p>고치지 않은 이유는 신원 축이 미확정이기 때문이다. 이 저장소의 관례
 * ({@code AddressBookApiController})는 {@code @AuthenticationPrincipal} 의 {@code getUsername()} 을
 * 넘기는데 그 값은 <b>esntlId</b> 이고, 감사 컬럼 계열({@code frst_rgtr_id} 등)은 <b>loginId</b> 를
 * 기대한다({@code docs/04-operations/wave2-carryover.md} §2 A-3(b) 의 신원 축 실측 참조).
 * 어느 쪽인지 확인하지 않고 넣으면 <b>틀린 식별자를 감사 이력에 영구 기록</b>하게 된다 —
 * 잠기는 것은 보이지만 틀린 기록은 보이지 않는다.
 *
 * <p>착수 시: {@code tb_faq} 의 해당 컬럼 실값을 {@code db-bridge} 로 조회해 축을 확정한 뒤 넣을 것.
 */
@Tag(name = "FAQ", description = "FAQ 관리 API")
@RestController
@RequestMapping("/api/v1/faqs")
@RequiredArgsConstructor
public class FaqApiController {

    private final FaqService faqService;

    @Operation(summary = "FAQ 목록 조회")
    @Authenticated
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FaqDto>>> getFaqList(
            @ModelAttribute BaseSearchDto searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPageIndex() - 1, searchDto.getPageUnit());
        Page<FaqDto> page = faqService.getFaqList(searchDto.getSearchKeyword(), pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "FAQ 상세 조회")
    @Authenticated
    @GetMapping("/{faqId}")
    public ResponseEntity<ApiResponse<FaqDto>> getFaq(@PathVariable String faqId) {
        faqService.increaseInqCnt(faqId);
        FaqDto result = faqService.getFaq(faqId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "FAQ 등록")
    @AdminOrSystem
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createFaq(@Valid @RequestBody FaqDto dto) {
        String id = faqService.createFaq("SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "FAQ 수정")
    @AdminOrSystem
    @PutMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> updateFaq(@PathVariable String faqId, @Valid @RequestBody FaqDto dto) {
        dto.setFaqId(faqId);
        faqService.updateFaq(faqId, "SYSTEM", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "FAQ 삭제")
    @AdminOrSystem
    @DeleteMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> deleteFaq(@PathVariable String faqId) {
        faqService.deleteFaq(faqId, "SYSTEM");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
