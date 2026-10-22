package nuri.api.controller.business.cms;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.api.support.PageRequests;
import nuri.api.support.UnsortedPageable;
import nuri.business.service.cms.CmsPageAdminService;
import nuri.business.service.cms.dto.CmsPageCreateRequest;
import nuri.business.service.cms.dto.CmsPageDetailDto;
import nuri.business.service.cms.dto.CmsPageDraftRequest;
import nuri.business.service.cms.dto.CmsPagePublishRequest;
import nuri.business.service.cms.dto.CmsPageStateRequest;
import nuri.business.service.cms.dto.CmsPageSummaryDto;
import nuri.business.service.cms.dto.CmsRevisionDetailDto;
import nuri.business.service.cms.dto.CmsRevisionSummaryDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 콘텐츠 페이지 관리 API(ADR-0039). 초안 저장은 게시본을 바꾸지 않고, 게시·게시 중지·보관은 화면이 읽은 버전에 묶인다.
 */
@Tag(name = "CmsPageAdmin", description = "콘텐츠 페이지 관리 API (Admin)")
@RestController("cmsPageAdminApiController")
@RequestMapping("/api/v1/admin/system/content-pages")
@RequiredArgsConstructor
public class CmsPageAdminApiController {

    private final CmsPageAdminService cmsPageAdminService;

    @Operation(summary = "콘텐츠 페이지 목록", description = "제목·주소와 상태(ACTIVE·DRAFT·PUBLISHED·ARCHIVED)로 좁혀 최근 수정 순으로 조회합니다.")
    @GetMapping
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#getPages')")
    public ResponseEntity<ApiResponse<PageResponse<CmsPageSummaryDto>>> getPages(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) @UnsortedPageable Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                cmsPageAdminService.getPages(keyword, status, PageRequests.unsorted(pageable)))));
    }

    @Operation(summary = "콘텐츠 페이지 만들기", description = "초안으로 시작하는 콘텐츠 페이지를 만듭니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#createPage')")
    public ResponseEntity<ApiResponse<Long>> createPage(@Valid @RequestBody CmsPageCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(cmsPageAdminService.createPage(request)));
    }

    @Operation(summary = "콘텐츠 페이지 상세", description = "초안 문서와 게시 상태를 조회합니다.")
    @GetMapping("/{contsSn}")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#getPage')")
    public ResponseEntity<ApiResponse<CmsPageDetailDto>> getPage(
            @Parameter(description = "콘텐츠 일련번호") @PathVariable Long contsSn) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.getPage(contsSn)));
    }

    @Operation(summary = "초안 저장", description = "초안을 저장합니다. 게시본은 바뀌지 않습니다. 읽은 버전과 다르면 409 입니다.")
    @PutMapping("/{contsSn}/draft")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#saveDraft')")
    public ResponseEntity<ApiResponse<CmsPageDetailDto>> saveDraft(
            @PathVariable Long contsSn, @Valid @RequestBody CmsPageDraftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.saveDraft(contsSn, request)));
    }

    @Operation(summary = "게시", description = "저장된 초안을 새 게시본으로 게시합니다. 읽은 버전과 다르면 409 입니다.")
    @PostMapping("/{contsSn}/publish")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#publish')")
    public ResponseEntity<ApiResponse<CmsPageDetailDto>> publish(
            @PathVariable Long contsSn, @Valid @RequestBody CmsPagePublishRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.publish(contsSn, request)));
    }

    @Operation(summary = "게시 중지", description = "사용자에게 보이지 않게 합니다. 업무 홈에 지정돼 있으면 지정도 해제됩니다.")
    @PostMapping("/{contsSn}/unpublish")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#unpublish')")
    public ResponseEntity<ApiResponse<CmsPageDetailDto>> unpublish(
            @PathVariable Long contsSn, @Valid @RequestBody CmsPageStateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.unpublish(contsSn, request)));
    }

    @Operation(summary = "보관", description = "게시 중이 아닌 페이지를 기본 목록에서 정리합니다.")
    @PostMapping("/{contsSn}/archive")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#archive')")
    public ResponseEntity<ApiResponse<CmsPageDetailDto>> archive(
            @PathVariable Long contsSn, @Valid @RequestBody CmsPageStateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.archive(contsSn, request)));
    }

    @Operation(summary = "보관 해제", description = "보관한 페이지를 초안 목록으로 되돌립니다. 다시 게시하지 않습니다.")
    @PostMapping("/{contsSn}/unarchive")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#unarchive')")
    public ResponseEntity<ApiResponse<CmsPageDetailDto>> unarchive(
            @PathVariable Long contsSn, @Valid @RequestBody CmsPageStateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.unarchive(contsSn, request)));
    }

    @Operation(summary = "게시 이력", description = "게시본 목록을 최신 순으로 조회합니다.")
    @GetMapping("/{contsSn}/revisions")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#getRevisions')")
    public ResponseEntity<ApiResponse<List<CmsRevisionSummaryDto>>> getRevisions(@PathVariable Long contsSn) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.getRevisions(contsSn)));
    }

    @Operation(summary = "게시본 조회", description = "지난 게시본 하나를 조회합니다. 복원은 이 내용을 새 초안으로 저장하는 동작입니다.")
    @GetMapping("/{contsSn}/revisions/{contsRvsnSn}")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsPageAdminApiController#getRevision')")
    public ResponseEntity<ApiResponse<CmsRevisionDetailDto>> getRevision(
            @PathVariable Long contsSn, @PathVariable Long contsRvsnSn) {
        return ResponseEntity.ok(ApiResponse.success(cmsPageAdminService.getRevision(contsSn, contsRvsnSn)));
    }
}
