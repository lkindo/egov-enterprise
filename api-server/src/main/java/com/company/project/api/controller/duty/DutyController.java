package com.company.project.api.controller.duty;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.duty.EgovDutyService;
import com.company.project.service.duty.dto.DutyCheckDto;
import com.company.project.service.duty.dto.DutyDiaryDto;
import com.company.project.service.duty.dto.DutyDto;
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

@Tag(name = "Duty", description = "On-duty Management APIs")
@RestController
@RequestMapping("/api/v1/duties")
@RequiredArgsConstructor
public class DutyController {

    private final EgovDutyService dutyService;

    @Operation(summary = "당직 목록 조회", description = "당직 일지 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<DutyDto>>> getDutyList(
            @RequestParam(required = false) String bndtDePrefix,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(dutyService.getDutyList(bndtDePrefix, pageable)));
    }

    @Operation(summary = "당직 상세 조회", description = "특정 당직 정보와 일지를 조회합니다.")
    @GetMapping("/{bndtId}/{bndtDe}")
    public ResponseEntity<ApiResponse<DutyDto>> getDuty(
            @PathVariable String bndtId, @PathVariable String bndtDe) {
        return ResponseEntity.ok(ApiResponse.success(dutyService.getDuty(bndtId, bndtDe)));
    }

    @Operation(summary = "당직 등록", description = "새로운 당직 정보를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> registerDuty(
            @RequestBody DutyDto dto) {
        dutyService.registerDuty(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "당직 수정", description = "당직 정보를 수정합니다.")
    @PutMapping("/{bndtId}/{bndtDe}")
    public ResponseEntity<ApiResponse<Void>> updateDuty(
            @PathVariable String bndtId, @PathVariable String bndtDe,
            @RequestBody DutyDto dto) {
        dto.setBndtId(bndtId);
        dto.setBndtDe(bndtDe);
        dutyService.updateDuty(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "당직 삭제", description = "당직 정보와 일지를 삭제합니다.")
    @DeleteMapping("/{bndtId}/{bndtDe}")
    public ResponseEntity<ApiResponse<Void>> deleteDuty(
            @PathVariable String bndtId, @PathVariable String bndtDe) {
        dutyService.deleteDuty(bndtId, bndtDe);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "당직 일지 저장", description = "당직 일지 체크 리스트를 저장합니다.")
    @PostMapping("/diaries")
    public ResponseEntity<ApiResponse<Void>> saveDutyDiary(
            @RequestBody List<DutyDiaryDto> diaryList) {
        dutyService.saveDutyDiary(diaryList);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "당직 체크 항목 조회", description = "사용 가능한 당직 체크 항목 목록을 조회합니다.")
    @GetMapping("/check-items")
    public ResponseEntity<ApiResponse<List<DutyCheckDto>>> getDutyCheckList(
            @RequestParam(required = false) String useAt) {
        return ResponseEntity.ok(ApiResponse.success(dutyService.getDutyCheckList(useAt)));
    }
}
