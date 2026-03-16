package com.company.project.api.controller.smarttoolkit;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.scrap.EgovScrapService;
import com.company.project.service.scrap.dto.ScrapDto;
import com.company.project.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Scrap", description = "스크랩 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/scraps")
@RequiredArgsConstructor
public class ScrapApiController {

    private final EgovScrapService egovScrapService;

    @Operation(summary = "나의 스크랩 목록 조회", description = "사용자의 스크랩 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ScrapDto>>> getMyScrapList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {
        String userId = getCurrentUserId();
        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<ScrapDto> pageResult = egovScrapService.getMyScrapList(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "스크랩 상세 조회", description = "특정 스크랩의 상세 정보를 조회합니다.")
    @GetMapping("/{scrapId}")
    public ResponseEntity<ApiResponse<ScrapDto>> getScrap(@PathVariable String scrapId) {
        ScrapDto dto = egovScrapService.getScrap(scrapId);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "스크랩 등록", description = "새로운 스크랩을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createScrap(@RequestBody ScrapDto dto) {
        String userId = getCurrentUserId();
        if ("anonymous".equals(userId)) {
            return ResponseEntity.status(401).build();
        }
        String newId = egovScrapService.createScrap(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "스크랩 삭제", description = "스크랩을 삭제합니다.")
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
