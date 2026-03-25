package com.company.project.foundation.api.controller.system.template;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.domain.template.TmplatInfo;
import com.company.project.foundation.service.template.TmplatInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 커뮤니티 템플릿 정보 관리 API 컨트롤러
 */
@Tag(name = "Template", description = "템플릿 관리 API (Admin)")
@RestController("systemTemplateApiController")
@RequestMapping("/api/v1/admin/system/templates")
@RequiredArgsConstructor
public class TemplateApiController {

    private final TmplatInfoService tmplatInfoService;

    @Operation(summary = "템플릿 목록 조회", description = "시스템에 등록된 모든 게시판 템플릿 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TmplatInfo>>> selectTmplatInfoList() {
        return ResponseEntity.ok(ApiResponse.success(tmplatInfoService.selectTmplatInfoList()));
    }

    @Operation(summary = "템플릿 상세 조회", description = "특정 템플릿의 상세 정보를 조회합니다.")
    @GetMapping("/{tmplatId}")
    public ResponseEntity<ApiResponse<TmplatInfo>> selectTmplatInfoDetail(@PathVariable("tmplatId") String tmplatId) {
        return ResponseEntity.ok(ApiResponse.success(tmplatInfoService.selectTmplatInfoDetail(tmplatId)));
    }

    @Operation(summary = "템플릿 등록", description = "새로운 게시판 템플릿 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertTmplatInfo(@RequestBody TmplatInfo tmplatInfo) {
        tmplatInfoService.insertTmplatInfo(tmplatInfo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
