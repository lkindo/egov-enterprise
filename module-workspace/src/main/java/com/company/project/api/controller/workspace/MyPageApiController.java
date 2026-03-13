package com.company.project.api.controller.workspace;

import com.company.project.service.workspace.MyPageService;
import com.company.project.service.workspace.dto.MyPageContentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "My Page", description = "마이페이지 관리 API")
@RestController
@RequestMapping("/api/v1/workspace/mypage/contents")
@RequiredArgsConstructor
public class MyPageApiController {

    private final MyPageService myPageService;

    @Operation(summary = "마이페이지 콘텐츠 목록 조회")
    @GetMapping
    public ResponseEntity<List<MyPageContentDto>> getContents(@RequestParam(defaultValue = "false") boolean all) {
        if (all) {
            return ResponseEntity.ok(myPageService.getAllMyPageContents());
        }
        return ResponseEntity.ok(myPageService.getActiveMyPageContents());
    }

    @Operation(summary = "마이페이지 콘텐츠 등록")
    @PostMapping
    public ResponseEntity<Map<String, Object>> createContent(@RequestBody MyPageContentDto dto) {
        Map<String, Object> response = new HashMap<>();
        try {
            String newId = myPageService.createContent(dto);
            response.put("success", true);
            response.put("id", newId);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "마이페이지 콘텐츠 수정")
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateContent(@PathVariable String id, @RequestBody MyPageContentDto dto) {
        Map<String, Object> response = new HashMap<>();
        try {
            myPageService.updateContent(id, dto);
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "마이페이지 콘텐츠 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteContent(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            myPageService.deleteContent(id);
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }
}
