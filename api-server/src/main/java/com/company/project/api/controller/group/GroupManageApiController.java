package com.company.project.api.controller.group;

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
@RequestMapping("/api/v1/admin/security/groups")
@RequiredArgsConstructor
@Tag(name = "GroupManage", description = "그룹 관리 API")
public class GroupManageApiController {

    private final GroupManageService groupManageService;

    @Operation(summary = "그룹 목록 조회")
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

    @Operation(summary = "그룹 상세 조회")
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupManageDto>> getGroup(@PathVariable String groupId) {
        return ResponseEntity.ok(ApiResponse.success(groupManageService.selectGroup(groupId)));
    }

    @Operation(summary = "그룹 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertGroup(@RequestBody GroupManageDto dto) {
        groupManageService.insertGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "그룹 수정")
    @PutMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> updateGroup(
            @PathVariable String groupId,
            @RequestBody GroupManageDto dto) {
        dto.setGroupId(groupId);
        groupManageService.updateGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "그룹 삭제")
    @DeleteMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable String groupId) {
        groupManageService.deleteGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
