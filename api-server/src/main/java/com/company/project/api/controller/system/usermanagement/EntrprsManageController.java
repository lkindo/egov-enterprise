package com.company.project.api.controller.system.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.usermanagement.EgovEntrprsManageService;
import com.company.project.service.usermanagement.dto.EnterpriseUserDto;
import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Enterprise User (Admin)", description = "기업회원 관리 API (관리자용)")
@RestController
@RequestMapping("/api/v1/admin/system/enterprises")
@RequiredArgsConstructor
public class EntrprsManageController {

    private final EgovEntrprsManageService entrprsManageService;

    @Operation(summary = "기업회원 목록 조회", description = "시스템 괸리자가 기업회원 목록을 페이지네이션하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EnterpriseUserDto>>> getEnterprises(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(entrprsManageService.getEntrprsList(keyword, pageable)));
    }

    @Operation(summary = "기업회원 상세 조회", description = "특정 기업회원의 상세 정보를 조회합니다.")
    @GetMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<EnterpriseUserDto>> getEnterprise(
            @PathVariable String esntlId) {
        return ResponseEntity.ok(ApiResponse.success(entrprsManageService.getEntrprs(esntlId)));
    }

    @Operation(summary = "기업회원 등록", description = "시스템에 새로운 기업회원 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertEnterprise(@RequestBody EnterpriseUserDto dto) {
        entrprsManageService.insertEntrprs(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기업회원 정보 수정", description = "기존 기업회원의 정보를 수정합니다.")
    @PutMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> updateEnterprise(
            @PathVariable String esntlId,
            @RequestBody EnterpriseUserDto dto) {
        dto.setEsntlId(esntlId);
        entrprsManageService.updateEntrprs(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기업회원 삭제", description = "기업회원 정보를 시스템에서 삭제합니다.")
    @DeleteMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> deleteEnterprise(
            @PathVariable String esntlId) {
        entrprsManageService.deleteEntrprs(esntlId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "기업회원 비밀번호 변경", description = "관리자가 특정 기업회원의 비밀번호를 임의 탈환/변경합니다.")
    @PatchMapping("/{esntlId}/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @PathVariable String esntlId,
            @RequestParam String password) {
        entrprsManageService.updatePassword(esntlId, password);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}