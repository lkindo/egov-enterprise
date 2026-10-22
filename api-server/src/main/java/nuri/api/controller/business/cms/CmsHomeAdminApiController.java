package nuri.api.controller.business.cms;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.service.cms.CmsHomeService;
import nuri.business.service.cms.dto.CmsHomeDto;
import nuri.business.service.cms.dto.CmsHomeUpdateRequest;
import nuri.foundation.core.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 업무 홈 소개 지정 API(ADR-0039 결정 2). 업무 홈은 대체하지 않는다 — 지정한 게시 페이지가 홈 맨 위 조각으로 보인다.
 */
@Tag(name = "CmsHomeAdmin", description = "업무 홈 소개 지정 API (Admin)")
@RestController("cmsHomeAdminApiController")
@RequestMapping("/api/v1/admin/system/content-home")
@RequiredArgsConstructor
public class CmsHomeAdminApiController {

    private final CmsHomeService cmsHomeService;

    @Operation(summary = "업무 홈 소개 지정 조회", description = "업무 홈 맨 위에 보이도록 지정된 페이지와 설정 버전을 조회합니다.")
    @GetMapping
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsHomeAdminApiController#getHome')")
    public ResponseEntity<ApiResponse<CmsHomeDto>> getHome() {
        return ResponseEntity.ok(ApiResponse.success(cmsHomeService.getHome()));
    }

    @Operation(summary = "업무 홈 소개 지정", description = "게시 중인 페이지를 지정하거나 비워서 해제합니다. 읽은 설정 버전과 다르면 409 입니다.")
    @PutMapping
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.cms.CmsHomeAdminApiController#updateHome')")
    public ResponseEntity<ApiResponse<CmsHomeDto>> updateHome(@Valid @RequestBody CmsHomeUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cmsHomeService.updateHome(request)));
    }
}
