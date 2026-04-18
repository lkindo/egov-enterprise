package nuri.business.api.controller.poll;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.service.system.service.survey.OnlinePollService;
import nuri.foundation.service.system.service.survey.dto.OnlinePollItemDto;
import nuri.foundation.service.system.service.survey.dto.OnlinePollManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Poll", description = "온라인 설문 API")
@RestController
@RequestMapping("/api/v1/polls")
@RequiredArgsConstructor
public class PollApiController {

    private final OnlinePollService pollService;

    @Operation(summary = "설문 목록 조회", description = "온라인 설문 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OnlinePollManageDto>>> getPolls(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<OnlinePollManageDto> page = pollService.getPollList(searchWrd, pageable);
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
    public ResponseEntity<ApiResponse<Void>> createPoll(@RequestBody OnlinePollManageDto dto) {
        pollService.insertPoll(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 수정", description = "기존 설문 정보를 수정합니다.")
    @PutMapping("/{pollId}")
    public ResponseEntity<ApiResponse<Void>> updatePoll(
            @PathVariable String pollId,
            @RequestBody OnlinePollManageDto dto) {
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
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String pollId,
            @PathVariable String pollIemId) {
        pollService.vote(pollId, pollIemId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 항목 목록 조회", description = "특정 설문의 항목 목록을 조회합니다.")
    @GetMapping("/{pollId}/items")
    public ResponseEntity<ApiResponse<List<OnlinePollItemDto>>> getPollItems(@PathVariable String pollId) {
        return ResponseEntity.ok(ApiResponse.success(pollService.getPollItemList(pollId)));
    }
}
