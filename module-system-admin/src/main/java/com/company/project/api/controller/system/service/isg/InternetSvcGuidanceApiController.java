package com.company.project.api.controller.system.service.isg;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.isg.EgovInternetSvcGuidanceService;
import com.company.project.service.isg.dto.InternetSvcGuidanceDto;
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

    private final EgovInternetSvcGuidanceService isgService;

    @Operation(summary = "서비스 안내 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InternetSvcGuidanceDto>>> getIsgList(
            @RequestParam(required = false) String keyword, 
            Pageable pageable) {
        Page<InternetSvcGuidanceDto> result = isgService.getIntnetSvcGuidanceList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "서비스 안내 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InternetSvcGuidanceDto>> getIsg(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(isgService.getIntnetSvcGuidance(id)));
    }

    @Operation(summary = "서비스 안내 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> registerIsg(@Valid @RequestBody InternetSvcGuidanceDto dto) {
        isgService.registerIntnetSvcGuidance(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "서비스 안내 수정")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateIsg(
            @PathVariable String id, 
            @Valid @RequestBody InternetSvcGuidanceDto dto) {
        dto.setIntnetSvcId(id);
        isgService.updateIntnetSvcGuidance(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "서비스 안내 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIsg(@PathVariable String id) {
        isgService.deleteIntnetSvcGuidance(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
