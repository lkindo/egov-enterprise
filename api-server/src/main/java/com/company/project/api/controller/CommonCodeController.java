package com.company.project.api.controller;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Common Code", description = "Common Code Management APIs")
@RestController
@RequestMapping("/api/v1/codes")
@RequiredArgsConstructor
public class CommonCodeController {

    private final CommonCodeService commonCodeService;

    @Operation(summary = "공통코드 목록 조회", description = "전체 공통코드 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CommonCodeDto>>> getCodes(
            @RequestParam String codeGroupId) {
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.getCodesByGroup(codeGroupId)));
    }

    @Operation(summary = "공통코드 등록", description = "새로운 공통코드를 등록합니다. 관리자 권한이 필요합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<CommonCodeDto>> createCode(
            @Valid @RequestBody CommonCodeSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.createCode(request)));
    }
}
