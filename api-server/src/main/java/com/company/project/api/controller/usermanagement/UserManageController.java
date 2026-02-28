package com.company.project.api.controller.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.user.UserManageService;
import com.company.project.service.user.dto.UserManageDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "UserManage", description = "내부 사용자 관리 API")
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserManageController {

    private final UserManageService userManageService;

    @Operation(summary = "사용자 목록 조회", description = "내부 사용자 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UserManageDto>>> getUsers(
            @PageableDefault(size = 10) Pageable pageable) {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(pageable.getPageNumber() + 1);
        searchVO.setPageUnit(pageable.getPageSize());

        List<UserManageDto> list = userManageService.selectUserList(searchVO);
        int total = userManageService.selectUserListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse
                .success(PageResponse.of(list, pageable.getPageNumber() + 1, pageable.getPageSize(), total)));
    }

    @Operation(summary = "사용자 상세 조회", description = "특정 내부 사용자의 상세 정보를 조회합니다.")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserManageDto>> getUser(
            @Parameter(description = "사용자 ID") @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userManageService.selectUser(userId)));
    }

    @Operation(summary = "사용자 등록", description = "새로운 내부 사용자를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertUser(@RequestBody UserManageDto dto) {
        userManageService.insertUser(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 정보 수정", description = "기존 내부 사용자 정보를 수정합니다.")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable String userId,
            @RequestBody UserManageDto dto) {
        dto.setUserId(userId);
        userManageService.updateUser(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 삭제", description = "내부 사용자를 시스템에서 삭제합니다.")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String userId) {
        userManageService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "아이디 중복 확인", description = "사용자 아이디가 이미 존재하는지 확인합니다.")
    @GetMapping("/check-id")
    public ResponseEntity<ApiResponse<Boolean>> checkIdDplct(@RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(userManageService.checkIdDplct(userId) > 0));
    }
}
