package com.company.project.api.controller.holiday;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.holiday.HolidayService;
import com.company.project.service.holiday.dto.HolidayDto;
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

@Tag(name = "Holiday", description = "공휴일/휴일 관리 API")
@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    @Operation(summary = "공휴일 목록 조회", description = "등록된 공휴일 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<HolidayDto>>> getHolidays(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.getHolidayList(searchWrd, pageable)));
    }

    @Operation(summary = "월별 공휴일 조회 (달력용)", description = "특정 연월의 공휴일 목록을 조회합니다.")
    @GetMapping("/calendar")
    public ResponseEntity<ApiResponse<List<HolidayDto>>> getHolidaysByMonth(
            @RequestParam String year,
            @RequestParam String month) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.getHolidaysByYearMonth(year, month)));
    }

    @Operation(summary = "공휴일 상세 조회", description = "공휴일의 상세 정보를 조회합니다.")
    @GetMapping("/{restdeNo}")
    public ResponseEntity<ApiResponse<HolidayDto>> getHoliday(
            @Parameter(description = "공휴일 번호") @PathVariable Integer restdeNo) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.getHoliday(restdeNo)));
    }

    @Operation(summary = "공휴일 등록", description = "새로운 공휴일을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Integer>> createHoliday(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody HolidayDto holidayDto) {
        return ResponseEntity
                .ok(ApiResponse.success(holidayService.createHoliday(userDetails.getUsername(), holidayDto)));
    }

    @Operation(summary = "공휴일 정보 수정", description = "등록된 공휴일의 정보를 수정합니다.")
    @PutMapping("/{restdeNo}")
    public ResponseEntity<ApiResponse<Void>> updateHoliday(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "공휴일 번호") @PathVariable Integer restdeNo,
            @RequestBody HolidayDto holidayDto) {
        holidayService.updateHoliday(restdeNo, userDetails.getUsername(), holidayDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공휴일 삭제", description = "등록된 공휴일을 시스템에서 삭제합니다.")
    @DeleteMapping("/{restdeNo}")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(
            @Parameter(description = "공휴일 번호") @PathVariable Integer restdeNo) {
        holidayService.deleteHoliday(restdeNo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
