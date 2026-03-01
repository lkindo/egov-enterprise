package com.company.project.api.controller.system.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.usermanagement.UserManageService;
import com.company.project.service.usermanagement.dto.UserManageDto;
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

@Tag(name = "User Management (Admin)", description = "시스템 사용자 관리 API (관리자용)")
@RestController
@RequestMapping("/api/v1/admin/system/users")
@RequiredArgsConstructor
public class UserManageController {

    private final UserManageService userManageService;

    @Operation(summary = "?ъ슜??紐⑸줉 議고쉶", description = "?대? ?ъ슜??紐⑸줉???섏씠吏뺥븯??議고쉶?⑸땲??")
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

    @Operation(summary = "?ъ슜???곸꽭 議고쉶", description = "?뱀젙 ?대? ?ъ슜?먯쓽 ?곸꽭 ?뺣낫瑜?議고쉶?⑸땲??")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserManageDto>> getUser(
            @Parameter(description = "?ъ슜??ID") @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userManageService.selectUser(userId)));
    }

    @Operation(summary = "?ъ슜???깅줉", description = "?덈줈???대? ?ъ슜?먮? ?깅줉?⑸땲??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertUser(@RequestBody UserManageDto dto) {
        userManageService.insertUser(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?ъ슜???뺣낫 ?섏젙", description = "湲곗〈 ?대? ?ъ슜???뺣낫瑜??섏젙?⑸땲??")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable String userId,
            @RequestBody UserManageDto dto) {
        dto.setUserId(userId);
        userManageService.updateUser(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?ъ슜????젣", description = "?대? ?ъ슜?먮? ?쒖뒪?쒖뿉????젣?⑸땲??")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String userId) {
        userManageService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?꾩씠??以묐났 ?뺤씤", description = "?ъ슜???꾩씠?붽? ?대? 議댁옱?섎뒗吏 ?뺤씤?⑸땲??")
    @GetMapping("/check-id")
    public ResponseEntity<ApiResponse<Boolean>> checkIdDplct(@RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(userManageService.checkIdDplct(userId) > 0));
    }
}
