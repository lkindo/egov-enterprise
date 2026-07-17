package nuri.api.controller.business.smarttoolkit;

import jakarta.validation.Valid;
import nuri.business.service.scrap.ScrapService;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.security.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Scrap", description = "스크랩 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/scraps")
@RequiredArgsConstructor
public class ScrapApiController {

    private final ScrapService egovScrapService;

    @Operation(summary = "나의 스크랩 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ScrapDto>>> getMyScrapList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        String userId = currentLoginId();
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
    public ResponseEntity<ApiResponse<Void>> createScrap(@Valid @RequestBody ScrapDto dto) throws Exception {
        String userId = currentLoginId();
        egovScrapService.createScrap(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "스크랩 수정")
    @PutMapping("/{scrapId}")
    public ResponseEntity<ApiResponse<Void>> updateScrap(@PathVariable String scrapId, @Valid @RequestBody ScrapDto dto) {
        String userId = currentLoginId();
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

    /**
     * 현재 인증 주체의 loginId. 미인증 폴백 "anonymous"(기존 동작 보존; 프로덕션은 Security 가 미인증을 선차단).
     * [정체성] 스크랩 소유/필터/감사는 frstRgtrId(=loginId) 기준이므로 loginId 를 쓴다(esntlId 아님).
     * 과거 esntlId 반환은 getScrapList 를 항상 빈 목록으로 만들던 버그였다.
     */
    private String currentLoginId() {
        return SecurityUtil.getCurrentLoginId().orElse("anonymous");
    }
}
