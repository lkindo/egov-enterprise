package nuri.api.controller.business.workspace;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.workspace.MyPageService;
import nuri.business.service.workspace.dto.MyPageContentDto;
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
@RequestMapping("/api/v1/admin/system/workspace/mypage/contents")
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
    public ResponseEntity<ApiResponse<Long>> createContent(@Valid @RequestBody MyPageContentDto dto) {
        Long contsSn = myPageService.createContent(dto);
        return ResponseEntity.ok(ApiResponse.success(contsSn));
    }

    @Operation(summary = "마이페이지 콘텐츠 수정")
    @PutMapping("/{contsSn}")
    public ResponseEntity<ApiResponse<Void>> updateContent(@PathVariable Long contsSn, @Valid @RequestBody MyPageContentDto dto) {
        myPageService.updateContent(contsSn, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "마이페이지 콘텐츠 삭제")
    @DeleteMapping("/{contsSn}")
    public ResponseEntity<ApiResponse<Void>> deleteContent(@PathVariable Long contsSn) {
        myPageService.deleteContent(contsSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
