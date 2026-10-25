package nuri.api.controller.business.cms;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.api.support.PageRequests;
import nuri.api.support.UnsortedPageable;
import nuri.business.service.cms.CmsPageReadService;
import nuri.business.service.cms.dto.CmsHomeIntroDto;
import nuri.business.service.cms.dto.CmsPublishedPageDto;
import nuri.business.service.cms.dto.CmsPublishedPageSummaryDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 게시된 콘텐츠 페이지 읽기 API(ADR-0039 결정 3). 로그인 사용자 누구나 읽는다. 초안·지난 게시본은 이 경로로 나가지 않는다.
 */
@Tag(name = "CmsPage", description = "게시된 콘텐츠 페이지 API")
@RestController("cmsPageApiController")
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CmsPageApiController {

    private final CmsPageReadService cmsPageReadService;

    @Operation(summary = "게시된 콘텐츠 페이지", description = "주소의 현재 게시본을 조회합니다. 미게시·게시 중지·보관 페이지는 404 입니다.")
    @GetMapping("/content-pages/{contsPathNm}")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageApiController#getPublishedPage')")
    public ResponseEntity<ApiResponse<CmsPublishedPageDto>> getPublishedPage(
            @Parameter(description = "주소 /pages/ 뒤 경로") @PathVariable String contsPathNm) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageReadService.getPublishedPage(contsPathNm)));
    }

    @Operation(summary = "안내 페이지 목록", description = "게시 중인 콘텐츠 페이지를 최근 게시 순으로 조회합니다. 검색어는 제목·요약 부분 일치입니다.")
    @GetMapping("/content-pages")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageApiController#getPublishedPages')")
    public ResponseEntity<ApiResponse<PageResponse<CmsPublishedPageSummaryDto>>> getPublishedPages(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) @UnsortedPageable Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                cmsPageReadService.getPublishedPages(keyword, PageRequests.unsorted(pageable)))));
    }

    @Operation(summary = "업무 홈 소개", description = "업무 홈 맨 위에 보일 게시본을 조회합니다. 지정이 없거나 게시 중이 아니면 page 가 비어 있습니다.")
    @GetMapping("/content-home")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageApiController#getHomeIntro')")
    public ResponseEntity<ApiResponse<CmsHomeIntroDto>> getHomeIntro() {
        return ResponseEntity.ok(ApiResponse.success(new CmsHomeIntroDto(cmsPageReadService.getHomeIntro().orElse(null))));
    }
}
