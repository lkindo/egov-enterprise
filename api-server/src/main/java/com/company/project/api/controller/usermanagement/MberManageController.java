package com.company.project.api.controller.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.user.EgovMberManageService;
import com.company.project.service.user.dto.GeneralUserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "GeneralMember", description = "일반회원 관리 API")
@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MberManageController {

    private final EgovMberManageService mberManageService;

    @Operation(summary = "일반회원 목록 조회", description = "시스템에 등록된 일반회원 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<GeneralUserDto>>> getMembers(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(mberManageService.getMberList(keyword, pageable)));
    }

    @Operation(summary = "일반회원 상세 조회", description = "특정 일반회원의 상세 정보를 조회합니다.")
    @GetMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<GeneralUserDto>> getMember(
            @Parameter(description = "고유 ID") @PathVariable String esntlId) {
        return ResponseEntity.ok(ApiResponse.success(mberManageService.getMber(esntlId)));
    }

    @Operation(summary = "일반회원 등록", description = "새로운 일반회원 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertMember(
            @RequestBody GeneralUserDto dto) {
        mberManageService.insertMber(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "일반회원 정보 수정", description = "기존 일반회원 정보를 수정합니다.")
    @PutMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> updateMember(
            @PathVariable String esntlId,
            @RequestBody GeneralUserDto dto) {
        dto.setEsntlId(esntlId);
        mberManageService.updateMber(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "일반회원 삭제", description = "일반회원 정보를 삭제합니다.")
    @DeleteMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> deleteMember(
            @PathVariable String esntlId) {
        mberManageService.deleteMber(esntlId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "일반회원 비밀번호 변경", description = "일반회원의 비밀번호를 변경합니다.")
    @PatchMapping("/{esntlId}/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @PathVariable String esntlId,
            @RequestParam String password) {
        mberManageService.updatePassword(esntlId, password);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
