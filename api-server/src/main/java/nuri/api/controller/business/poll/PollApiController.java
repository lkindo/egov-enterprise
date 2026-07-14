package nuri.api.controller.business.poll;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.system.service.survey.EgovOnlinePollService;
import nuri.business.service.system.service.survey.dto.OnlinePollArticleDto;
import nuri.business.service.system.service.survey.dto.OnlinePollManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Poll", description = "온라인 설문 API")
@RestController
@RequestMapping("/api/v1/polls")
@RequiredArgsConstructor
public class PollApiController {

    private final EgovOnlinePollService pollService;

    @Operation(summary = "설문 목록 조회", description = "온라인 설문 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OnlinePollManageDto>>> getPolls(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<OnlinePollManageDto> page = pollService.getPollList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 상세 조회", description = "설문 상세 정보 및 항목 목록을 조회합니다.")
    @GetMapping("/{pollId}")
    public ResponseEntity<ApiResponse<OnlinePollManageDto>> getPoll(
            @Parameter(description = "설문 ID") @PathVariable String pollId) {
        return ResponseEntity.ok(ApiResponse.success(pollService.getPoll(pollId)));
    }

    @Operation(summary = "설문 등록", description = "새로운 설문을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createPoll(@Valid @RequestBody OnlinePollManageDto dto) {
        pollService.insertPoll(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 수정", description = "기존 설문 정보를 수정합니다.")
    @PutMapping("/{pollId}")
    public ResponseEntity<ApiResponse<Void>> updatePoll(
            @PathVariable String pollId,
            @Valid @RequestBody OnlinePollManageDto dto) {
        dto.setPollId(pollId);
        pollService.updatePoll(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 삭제", description = "설문을 삭제합니다.")
    @DeleteMapping("/{pollId}")
    public ResponseEntity<ApiResponse<Void>> deletePoll(@PathVariable String pollId) {
        pollService.deletePoll(pollId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 참여(투표)", description = "특정 설문 항목에 투표합니다.")
    @PostMapping("/{pollId}/vote/{pollIemId}")
    public ResponseEntity<ApiResponse<Void>> vote(
            @PathVariable String pollId,
            @PathVariable("pollIemId") String pollArtclId) {
        // 투표자 식별은 loginId 로 한다. 감사 컬럼 frst_rgtr_id(=loginId)·이중투표 유니크 제약과
        // 동일한 식별자여야 하므로 getUsername()(=esntlId) 이 아니라 getCurrentLoginId() 를 쓴다.
        String loginId = nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new nuri.foundation.core.exception.BusinessException(
                        "로그인이 필요합니다.", nuri.foundation.core.exception.CommonErrorCode.UNAUTHORIZED));
        pollService.vote(pollId, pollArtclId, loginId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 목록 조회", description = "특정 설문의 항목 목록을 조회합니다.")
    @GetMapping("/{pollId}/items")
    public ResponseEntity<ApiResponse<List<OnlinePollArticleDto>>> getPollItems(@PathVariable String pollId) {
        return ResponseEntity.ok(ApiResponse.success(pollService.getPollItemList(pollId)));
    }
}
