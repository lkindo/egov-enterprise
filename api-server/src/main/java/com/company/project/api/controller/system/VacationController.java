package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.vacation.VacationService;
import com.company.project.service.vacation.dto.UserAbsenceDto;
import com.company.project.service.vacation.dto.VacationDto;
import com.company.project.service.vacation.dto.YearlyLeaveDto;
import io.swagger.v3.oas.annotations.Operation;
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

@Tag(name = "Vacation (Admin)", description = "휴가 및 연차 통합 관리 API (관리자용)")
@RestController("systemVacationController")
@RequestMapping("/api/v1/admin/system/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    @Operation(summary = "전체 휴가 신청 목록 조회", description = "관리자가 전체 사용자의 휴가 신청 내역을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacationList(null, searchWrd, pageable)));
    }

    @Operation(summary = "휴가 승인/반려 처리", description = "신청된 휴가에 대해 승인 또는 반려 처리를 수행합니다.")
    @PutMapping("/approval")
    public ResponseEntity<ApiResponse<Void>> approveVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        vacationService.confirmVacation(userDetails.getUsername(), applcntId, vcatnSe, bgnde, confmAt, returnResn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "전사 연차 관리 목록 조회", description = "특정 연도의 사용자별 연차 정보를 조회합니다.")
    @GetMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<List<YearlyLeaveDto>>> getAnnualLeaveList(
            @RequestParam String occrrncYear,
            @RequestParam(required = false) String searchWrd) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getYearlyLeaveList(occrrncYear, searchWrd)));
    }

    @Operation(summary = "연차 정보 등록/수정", description = "사용자의 연차 발생일 등을 수동으로 관리합니다.")
    @PostMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<Void>> saveAnnualLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody YearlyLeaveDto dto) {
        vacationService.saveYearlyLeave(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 부재 설정 목록 조회", description = "시스템 내 전체 사용자 부재 설정을 조회합니다.")
    @GetMapping("/absence")
    public ResponseEntity<ApiResponse<Page<UserAbsenceDto>>> getUserAbsences(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsenceList(searchWrd, pageable)));
    }

    @Operation(summary = "사용자 부재 설정 상세 조회", description = "특정 사용자의 부재 설정 정보를 조회합니다.")
    @GetMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<UserAbsenceDto>> getUserAbsence(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsence(userId)));
    }

    @Operation(summary = "사용자 부재 영역 설정", description = "특정 사용자의 부재 상태를 강제 설정하거나 수정합니다.")
    @PostMapping("/absence")
    public ResponseEntity<ApiResponse<Void>> saveUserAbsence(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UserAbsenceDto dto) {
        vacationService.saveUserAbsence(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 부재 설정 삭제", description = "사용자의 부재 설정을 초기화(삭제)합니다.")
    @DeleteMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUserAbsence(@PathVariable String userId) {
        vacationService.deleteUserAbsence(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
