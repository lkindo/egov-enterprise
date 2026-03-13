package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/groups")
@RequiredArgsConstructor
@Tag(name = "GroupAdminController", description = "시스템 사용자 그룹 관리 API (관리자용)")
public class GroupAdminController {

    private final GroupManageService groupManageService;

    @Operation(summary = "그룹 목록 조회", description = "시스템에 정의된 전체 사용자 그룹 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<GroupManageDto>>> getGroups(
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            @RequestParam(value = "searchKeyword", defaultValue = "") String searchKeyword) {

        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(pageIndex);
        searchVO.setSearchKeyword(searchKeyword);
        searchVO.setPageUnit(10);

        List<GroupManageDto> list = groupManageService.selectGroupList(searchVO);
        int total = groupManageService.selectGroupListTotCnt(searchVO);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, pageIndex, 10, total)));
    }

    @Operation(summary = "그룹 상세 조회", description = "특정 사용자 그룹의 상세 정보를 조회합니다.")
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupManageDto>> getGroup(@PathVariable String groupId) {
        return ResponseEntity.ok(ApiResponse.success(groupManageService.selectGroup(groupId)));
    }

    @Operation(summary = "그룹 등록", description = "새로운 시스템 사용자 그룹을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createGroup(@RequestBody GroupManageDto dto) {
        groupManageService.insertGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "그룹 수정", description = "기존 시스템 사용자 그룹 정보를 수정합니다.")
    @PutMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> updateGroup(
            @PathVariable String groupId,
            @RequestBody GroupManageDto dto) {
        dto.setGroupId(groupId);
        groupManageService.updateGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "그룹 삭제", description = "시스템 사용자 그룹 정보를 삭제합니다.")
    @DeleteMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable String groupId) {
        groupManageService.deleteGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
