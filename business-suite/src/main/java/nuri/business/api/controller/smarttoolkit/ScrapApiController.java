package nuri.business.api.controller.smarttoolkit;

import nuri.business.service.scrap.EgovScrapService;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Scrap", description = "스크랩 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/scraps")
@RequiredArgsConstructor
public class ScrapApiController {

    private final EgovScrapService egovScrapService;

    @Operation(summary = "나의 스크랩 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ScrapDto>>> getMyScrapList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        String userId = getCurrentUserId();
        Pageable pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<ScrapDto> pageResult = egovScrapService.getMyScrapList(userId, pageable);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "스크랩 상세 조회")
    @GetMapping("/{scrapId}")
    public ResponseEntity<ApiResponse<ScrapDto>> getScrap(@PathVariable String scrapId) {
        ScrapDto result = egovScrapService.getScrap(scrapId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "스크랩 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createScrap(@RequestBody ScrapDto dto) throws Exception {
        String userId = getCurrentUserId();
        egovScrapService.createScrap(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "스크랩 수정")
    @PutMapping("/{scrapId}")
    public ResponseEntity<ApiResponse<Void>> updateScrap(@PathVariable String scrapId, @RequestBody ScrapDto dto) {
        String userId = getCurrentUserId();
        dto.setScrapId(scrapId);
        egovScrapService.updateScrap(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "스크랩 삭제")
    @DeleteMapping("/{scrapId}")
    public ResponseEntity<ApiResponse<Void>> deleteScrap(@PathVariable String scrapId) {
        egovScrapService.deleteScrap(scrapId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getEsntlId();
        }
        return "anonymous";
    }
}
