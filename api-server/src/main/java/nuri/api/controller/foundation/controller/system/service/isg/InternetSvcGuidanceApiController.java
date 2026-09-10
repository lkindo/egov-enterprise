package nuri.api.controller.foundation.controller.system.service.isg;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.isg.InternetSvcGuidanceService;
import nuri.business.service.isg.dto.InternetSvcGuidanceDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 인터넷 서비스 안내(ISG) 관리 API 컨트롤러
 */
@Tag(name = "Internet Service Guidance", description = "인터넷 서비스 안내 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/isg")
@RequiredArgsConstructor
public class InternetSvcGuidanceApiController {

    private final InternetSvcGuidanceService isgService;

    @Operation(summary = "서비스 안내 목록 조회")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.service.isg.InternetSvcGuidanceApiController#getIsgList')")
    public ResponseEntity<ApiResponse<PageResponse<InternetSvcGuidanceDto>>> getIsgList(
            @RequestParam(required = false) String keyword, 
            Pageable pageable) {
        Page<InternetSvcGuidanceDto> result = isgService.getIntnetSvcGuidanceList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "서비스 안내 상세 조회")
    @GetMapping("/{itntSrvcSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.service.isg.InternetSvcGuidanceApiController#getIsg')")
    public ResponseEntity<ApiResponse<InternetSvcGuidanceDto>> getIsg(@PathVariable Long itntSrvcSn) {
        return ResponseEntity.ok(ApiResponse.success(isgService.getIntnetSvcGuidance(itntSrvcSn)));
    }

    @Operation(summary = "서비스 안내 등록")
    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.service.isg.InternetSvcGuidanceApiController#registerIsg')")
    public ResponseEntity<ApiResponse<Long>> registerIsg(@Valid @RequestBody InternetSvcGuidanceDto dto) {
        Long itntSrvcSn = isgService.registerIntnetSvcGuidance(dto);
        return ResponseEntity.ok(ApiResponse.success(itntSrvcSn));
    }

    @Operation(summary = "서비스 안내 수정")
    @PutMapping("/{itntSrvcSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.service.isg.InternetSvcGuidanceApiController#updateIsg')")
    public ResponseEntity<ApiResponse<Void>> updateIsg(
            @PathVariable Long itntSrvcSn,
            @Valid @RequestBody InternetSvcGuidanceDto dto) {
        dto.setItntSrvcSn(itntSrvcSn);
        isgService.updateIntnetSvcGuidance(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "서비스 안내 삭제")
    @DeleteMapping("/{itntSrvcSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.service.isg.InternetSvcGuidanceApiController#deleteIsg')")
    public ResponseEntity<ApiResponse<Void>> deleteIsg(@PathVariable Long itntSrvcSn) {
        isgService.deleteIntnetSvcGuidance(itntSrvcSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
