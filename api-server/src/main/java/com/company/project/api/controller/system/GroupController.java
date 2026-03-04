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
@RestController("systemGroupController")
@RequestMapping("/api/v1/admin/system/groups")
@RequiredArgsConstructor
@Tag(name = "Group (Admin)", description = "?스???용??그룹 관?API (관리자??")
public class GroupController {

    private final GroupManageService groupManageService;

    @Operation(summary = "그룹 목록 조회", description = "?스?에 ?의???체 ?용??그룹 목록??조회?니??")
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

    @Operation(summary = "그룹 ?세 조회", description = "?정 ?용??그룹???세 ?보?조회?니??")
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupManageDto>> getGroup(@PathVariable String groupId) {
        return ResponseEntity.ok(ApiResponse.success(groupManageService.selectGroup(groupId)));
    }

    @Operation(summary = "그룹 ?록", description = "?로???스???용??그룹???록?니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createGroup(@RequestBody GroupManageDto dto) {
        groupManageService.insertGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "그룹 ?정", description = "기존 ?스???용??그룹 ?보??정?니??")
    @PutMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> updateGroup(
            @PathVariable String groupId,
            @RequestBody GroupManageDto dto) {
        dto.setGroupId(groupId);
        groupManageService.updateGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "그룹 ??", description = "?스???용??그룹 ?보????니??")
    @DeleteMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable String groupId) {
        groupManageService.deleteGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}