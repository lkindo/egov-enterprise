package com.company.project.api.controller.workspace;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.workspace.MyPageService;
import com.company.project.service.workspace.dto.MyPageContentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 마이페이지 콘텐츠 관리 API 컨트롤러 (Admin)
 */
@Tag(name = "My Page Admin", description = "마이페이지 콘텐츠 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/workspace/mypage/contents")
@RequiredArgsConstructor
public class MyPageApiController {

    private final MyPageService myPageService;

    @Operation(summary = "마이페이지 콘텐츠 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<MyPageContentDto>>> getContents(@RequestParam(defaultValue = "false") boolean all) {
        List<MyPageContentDto> list;
        if (all) {
            list = myPageService.getAllMyPageContents();
        } else {
            list = myPageService.getActiveMyPageContents();
        }
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @Operation(summary = "마이페이지 콘텐츠 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createContent(@RequestBody MyPageContentDto dto) {
        String newId = myPageService.createContent(dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "마이페이지 콘텐츠 수정")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateContent(@PathVariable String id, @RequestBody MyPageContentDto dto) {
        myPageService.updateContent(id, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "마이페이지 콘텐츠 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteContent(@PathVariable String id) {
        myPageService.deleteContent(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
