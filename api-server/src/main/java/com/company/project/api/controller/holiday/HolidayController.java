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

@Tag(name = "Holiday", description = "공휴???�일 관�?API")
@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    @Operation(summary = "공휴??목록 조회", description = "?�록??공휴??목록???�이징하??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<HolidayDto>>> getHolidays(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.getHolidayList(searchWrd, pageable)));
    }

    @Operation(summary = "?�별 공휴??조회 (?�력??", description = "?�정 ?�월??공휴??목록??조회?�니??")
    @GetMapping("/calendar")
    public ResponseEntity<ApiResponse<List<HolidayDto>>> getHolidaysByMonth(
            @RequestParam String year,
            @RequestParam String month) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.getHolidaysByYearMonth(year, month)));
    }

    @Operation(summary = "공휴???�세 조회", description = "공휴?�의 ?�세 ?�보�?조회?�니??")
    @GetMapping("/{restdeNo}")
    public ResponseEntity<ApiResponse<HolidayDto>> getHoliday(
            @Parameter(description = "공휴??번호") @PathVariable Integer restdeNo) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.getHoliday(restdeNo)));
    }

    @Operation(summary = "공휴???�록", description = "?�로??공휴?�을 ?�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Integer>> createHoliday(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody HolidayDto holidayDto) {
        return ResponseEntity
                .ok(ApiResponse.success(holidayService.createHoliday(userDetails.getUsername(), holidayDto)));
    }

    @Operation(summary = "공휴???�보 ?�정", description = "?�록??공휴?�의 ?�보�??�정?�니??")
    @PutMapping("/{restdeNo}")
    public ResponseEntity<ApiResponse<Void>> updateHoliday(
            @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "공휴??번호") @PathVariable Integer restdeNo,
            @RequestBody HolidayDto holidayDto) {
        holidayService.updateHoliday(restdeNo, userDetails.getUsername(), holidayDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "공휴????��", description = "?�록??공휴?�을 ?�스?�에????��?�니??")
    @DeleteMapping("/{restdeNo}")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(
            @Parameter(description = "공휴??번호") @PathVariable Integer restdeNo) {
        holidayService.deleteHoliday(restdeNo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
