package com.company.project.api.controller.survey;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.survey.EgovOnlinePollService;
import com.company.project.service.survey.dto.OnlinePollManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "OnlinePoll", description = "Online Poll Management APIs")

@RestController

@RequestMapping("/api/v1/polls")

@RequiredArgsConstructor

public class OnlinePollController {

    private final EgovOnlinePollService onlinePollService;

@Operation(summary = "??      ????   ?            ?         ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<OnlinePollManageDto>>> getPolls(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(onlinePollService.getPollList(keyword, pageable)));

    }

@Operation(summary = "??      ????   ??                   ??")

    @GetMapping("/{pollId}")

    public ResponseEntity<ApiResponse<OnlinePollManageDto>> getPoll(@PathVariable String pollId) {

        return ResponseEntity.ok(ApiResponse.success(onlinePollService.getPoll(pollId)));

    }

@Operation(summary = "??      ????   ??         ")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertPoll(@RequestBody OnlinePollManageDto dto) {

        onlinePollService.insertPoll(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??      ????   ???   ??      ")

    @PostMapping("/{pollId}/vote")

    public ResponseEntity<ApiResponse<Void>> vote(

            @PathVariable String pollId,

            @RequestParam String pollIemId) {

        onlinePollService.vote(pollId, pollIemId, null);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
