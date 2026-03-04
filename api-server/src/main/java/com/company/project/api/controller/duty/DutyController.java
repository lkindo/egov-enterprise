package com.company.project.api.controller.duty;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.duty.EgovDutyService;

import com.company.project.service.duty.dto.DutyCheckDto;

import com.company.project.service.duty.dto.DutyDiaryDto;

import com.company.project.service.duty.dto.DutyDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Duty", description = "On-duty Management APIs")

@RestController

@RequestMapping("/api/v1/duties")

@RequiredArgsConstructor

public class DutyController {

    private final EgovDutyService dutyService;

@Operation(summary = "?        ?            ?         ??", description = "?        ????             ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<DutyDto>>> getDutyList(

            @RequestParam(required = false) String bndtDePrefix,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(dutyService.getDutyList(bndtDePrefix, pageable)));

    }

@Operation(summary = "?        ??                   ??", description = "?     ???        ??         ?? ?????         ???      ??")

    @GetMapping("/{bndtId}/{bndtDe}")

    public ResponseEntity<ApiResponse<DutyDto>> getDuty(

            @PathVariable String bndtId, @PathVariable String bndtDe) {

        return ResponseEntity.ok(ApiResponse.success(dutyService.getDuty(bndtId, bndtDe)));

    }

@Operation(summary = "?        ??         ", description = "??      ???        ??         ???         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> registerDuty(

            @RequestBody DutyDto dto) {

        dutyService.registerDuty(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?        ???      ", description = "?        ??         ????      ??      ??")

    @PutMapping("/{bndtId}/{bndtDe}")

    public ResponseEntity<ApiResponse<Void>> updateDuty(

            @PathVariable String bndtId, @PathVariable String bndtDe,

            @RequestBody DutyDto dto) {

        dto.setBndtId(bndtId);

        dto.setBndtDe(bndtDe);

        dutyService.updateDuty(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?        ?????", description = "?        ??         ?? ??????????      ??")

    @DeleteMapping("/{bndtId}/{bndtDe}")

    public ResponseEntity<ApiResponse<Void>> deleteDuty(

            @PathVariable String bndtId, @PathVariable String bndtDe) {

        dutyService.deleteDuty(bndtId, bndtDe);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?        ???? ????", description = "?        ????             ??         ?   ? ???        ??      .")

    @PostMapping("/diaries")

    public ResponseEntity<ApiResponse<Void>> saveDutyDiary(

            @RequestBody List<DutyDiaryDto> diaryList) {

        dutyService.saveDutyDiary(diaryList);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?        ?            ?????         ??", description = "????        ?      ??        ?            ?????            ??         ???      ??")

    @GetMapping("/check-items")

    public ResponseEntity<ApiResponse<List<DutyCheckDto>>> getDutyCheckList(

            @RequestParam(required = false) String useAt) {

        return ResponseEntity.ok(ApiResponse.success(dutyService.getDutyCheckList(useAt)));

    }

}