package com.company.project.api.controller.vacation;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.vacation.VacationService;
import com.company.project.service.vacation.dto.VacationDto;
import com.company.project.service.vacation.dto.YearlyLeaveDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Vacation (User)", description = "내 휴가 및 연차 관리 API (사용자용)")
@RestController
@RequestMapping("/api/v1/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    @Operation(summary = "나의 휴가 신청 목록 조회", description = "사용자 본인의 휴가 신청 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacations(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(vacationService.getVacationList(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "휴가 신청 상세 조회", description = "신청된 단일 휴가의 상세 정보를 확인합니다.")
    @GetMapping("/detail")
    public ResponseEntity<ApiResponse<VacationDto>> getVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacation(applcntId, vcatnSe, bgnde)));
    }

    @Operation(summary = "휴가 신청", description = "새로운 휴가 신청서를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> requestVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.requestVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "휴가 신청 수정", description = "대기 중인 휴가 신청 내용을 수정합니다.")
    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.updateVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "휴가 신청 취소", description = "신청된 휴가 정보를 삭제(취소)합니다.")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        vacationService.deleteVacation(applcntId, vcatnSe, bgnde);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "본인 연차 현황 조회", description = "로그인한 사용자의 당해 연도 잔여 연차 정보를 확인합니다.")
    @GetMapping("/yearly-leaves/my")
    public ResponseEntity<ApiResponse<YearlyLeaveDto>> getMyYearlyLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String occrrncYear) {
        return ResponseEntity
                .ok(ApiResponse.success(vacationService.getYearlyLeave(occrrncYear, userDetails.getUsername())));
    }
}
