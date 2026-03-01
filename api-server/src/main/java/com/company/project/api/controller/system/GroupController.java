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
@Tag(name = "Group (Admin)", description = "?œìŠ¤???¬ìš©??ê·¸ë£¹ ê´€ë¦?API (ê´€ë¦¬ì??")
public class GroupController {

    private final GroupManageService groupManageService;

    @Operation(summary = "ê·¸ë£¹ ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?œì— ?•ì˜???„ì²´ ?¬ìš©??ê·¸ë£¹ ëª©ë¡??ì¡°íšŒ?©ë‹ˆ??")
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

    @Operation(summary = "ê·¸ë£¹ ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?¬ìš©??ê·¸ë£¹???ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupManageDto>> getGroup(@PathVariable String groupId) {
        return ResponseEntity.ok(ApiResponse.success(groupManageService.selectGroup(groupId)));
    }

    @Operation(summary = "ê·¸ë£¹ ?±ë¡", description = "?ˆë¡œ???œìŠ¤???¬ìš©??ê·¸ë£¹???±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createGroup(@RequestBody GroupManageDto dto) {
        groupManageService.insertGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ê·¸ë£¹ ?˜ì •", description = "ê¸°ì¡´ ?œìŠ¤???¬ìš©??ê·¸ë£¹ ?•ë³´ë¥??˜ì •?©ë‹ˆ??")
    @PutMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> updateGroup(
            @PathVariable String groupId,
            @RequestBody GroupManageDto dto) {
        dto.setGroupId(groupId);
        groupManageService.updateGroup(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ê·¸ë£¹ ?? œ", description = "?œìŠ¤???¬ìš©??ê·¸ë£¹ ?•ë³´ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable String groupId) {
        groupManageService.deleteGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
