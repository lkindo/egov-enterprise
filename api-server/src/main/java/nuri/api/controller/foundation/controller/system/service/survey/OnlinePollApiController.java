package nuri.api.controller.foundation.controller.system.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.system.service.survey.EgovOnlinePollService;
import nuri.business.service.system.service.survey.dto.OnlinePollManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "OnlinePoll", description = "온라인 투표 관리 API (Admin)")
@RestController("systemOnlinePollApiController")
@RequestMapping("/api/v1/admin/system/polls")
@RequiredArgsConstructor
public class OnlinePollApiController {

    private final EgovOnlinePollService onlinePollService;

    @Operation(summary = "온라인 설문 목록 페이징 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OnlinePollManageDto>>> getPolls(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<OnlinePollManageDto> page = onlinePollService.getPollList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "온라인 설문 상세 조회")
    @GetMapping("/{pollId}")
    public ResponseEntity<ApiResponse<OnlinePollManageDto>> getPoll(@PathVariable String pollId) {
        return ResponseEntity.ok(ApiResponse.success(onlinePollService.getPoll(pollId)));
    }

    @Operation(summary = "온라인 설문 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertPoll(@Valid @RequestBody OnlinePollManageDto dto) {
        onlinePollService.insertPoll(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "온라인 설문 투표 처리")
    @PostMapping("/{pollId}/vote")
    public ResponseEntity<ApiResponse<Void>> vote(
            @PathVariable String pollId,
            @RequestParam(name = "pollIemId") String pollArtclId) {
        String userId = nuri.business.security.util.SecurityUtil.getCurrentUserId()
                .orElseThrow(() -> new nuri.foundation.core.exception.BusinessException("로그인이 필요합니다.", nuri.foundation.core.exception.CommonErrorCode.UNAUTHORIZED));
        onlinePollService.vote(pollId, pollArtclId, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
