package nuri.api.controller.business.calendar;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.service.calendar.RestdeService;
import nuri.business.service.calendar.dto.RestdeDto;
import nuri.business.security.service.CustomUserDetails;
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

/**
 * 휴일 관리 REST API 컨트롤러
 */
@Tag(name = "Calendar - Holiday", description = "휴일(공휴일) 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/calendar/holidays")
@RequiredArgsConstructor
public class RestdeApiController {

    private final RestdeService restdeService;

    @Operation(summary = "휴일 목록 조회", description = "휴일 목록을 조건별 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RestdeDto>>> getRestdeList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit,
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword) {
        
        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<RestdeDto> pageResult = restdeService.getRestdeList(searchCondition, searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "휴일 상세 조회", description = "특정 휴일의 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RestdeDto>> getRestde(@PathVariable Integer id) {
        RestdeDto dto = restdeService.getRestde(id);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "휴일 등록", description = "새로운 휴일 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Integer>> createRestde(@RequestBody RestdeDto dto) {
        String userId = getCurrentUserId();
        if ("anonymous".equals(userId)) {
            return ResponseEntity.status(401).build();
        }
        Integer newId = restdeService.createRestde(dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "휴일 수정", description = "기존 휴일 정보를 수정합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateRestde(@PathVariable Integer id, @RequestBody RestdeDto dto) {
        String userId = getCurrentUserId();
        if ("anonymous".equals(userId)) {
            return ResponseEntity.status(401).build();
        }
        restdeService.updateRestde(id, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "휴일 삭제", description = "등록된 휴일 정보를 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRestde(@PathVariable Integer id) {
        String userId = getCurrentUserId();
        if ("anonymous".equals(userId)) {
            return ResponseEntity.status(401).build();
        }
        restdeService.deleteRestde(id);
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
