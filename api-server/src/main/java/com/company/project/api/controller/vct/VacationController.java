package com.company.project.api.controller.vct;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.vct.VacationService;
import com.company.project.service.vct.dto.UserAbsenceDto;
import com.company.project.service.vct.dto.VacationDto;
import com.company.project.service.vct.dto.YearlyLeaveDto;
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

import java.util.List;

@Tag(name = "Vacation", description = "Vacation and Yearly Leave Management APIs")
@RestController
@RequestMapping("/api/v1/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    // --- Vacations ---

    @Operation(summary = "휴가 신청 목록 조회", description = "사용자 본인의 휴가 신청 목록을 검색 조건과 함께 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacations(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(vacationService.getVacationList(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "전체 휴가 목록 조회(관리자용)", description = "시스템 관리자가 모든 사용자로부터 신청된 휴가 목록을 검색 조건과 함께 페이징하여 조회합니다.")
    @GetMapping("/admin/all")
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getAllVacations(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(vacationService.getVacationList(null, searchWrd, pageable)));
    }

    @Operation(summary = "휴가 신청 상세 조회", description = "신청된 단일 휴가의 상세 정보 및 승인 상태 정보를 확인합니다.")
    @GetMapping("/detail")
    public ResponseEntity<ApiResponse<VacationDto>> getVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacation(applcntId, vcatnSe, bgnde)));
    }

    @Operation(summary = "휴가 신청 진행", description = "새로운 휴가 신청서를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> requestVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.requestVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "휴가 신청 내용 수정", description = "신청된 휴가의 내용을 수정합니다. 보통 반려된 건이나 대기 중인 상태에서만 가능합니다.")
    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.updateVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "휴가 신청 취소 및 삭제", description = "신청된 휴가 정보를 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        vacationService.deleteVacation(applcntId, vcatnSe, bgnde);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "휴가 승인 및 처리", description = "관리자가 신청된 휴가에 대해 승인 혹은 반려 처리를 수행합니다.")
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

    // --- Yearly Leaves ---

    @Operation(summary = "사용자 연차 관리 목록 조회", description = "특정 연도의 각 사용자별 연차 관리 정보 목록을 조회합니다.")
    @GetMapping("/yearly-leaves")
    public ResponseEntity<ApiResponse<List<YearlyLeaveDto>>> getYearlyLeaves(
            @RequestParam String occrrncYear,
            @RequestParam(required = false) String searchWrd) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getYearlyLeaveList(occrrncYear, searchWrd)));
    }

    @Operation(summary = "본인의 현재 연차 정보 조회", description = "로그인한 사용자의 현재 연도 잔여 연차 정보를 확인합니다.")
    @GetMapping("/yearly-leaves/my")
    public ResponseEntity<ApiResponse<YearlyLeaveDto>> getMyYearlyLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String occrrncYear) {
        return ResponseEntity
                .ok(ApiResponse.success(vacationService.getYearlyLeave(occrrncYear, userDetails.getUsername())));
    }

    @Operation(summary = "연차 정보 등록 및 수정", description = "사용자 개인의 연차 발생일 등의 정보를 등록하거나 수정합니다.")
    @PostMapping("/yearly-leaves")
    public ResponseEntity<ApiResponse<Void>> saveYearlyLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody YearlyLeaveDto dto) {
        vacationService.saveYearlyLeave(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // --- User Absence ---

    @Operation(summary = "사용자 부재 여부 전체 목록 조회", description = "시스템 내 사용자들 전체의 부재 정보를 페이징하여 조회합니다.")
    @GetMapping("/absence")
    public ResponseEntity<ApiResponse<Page<UserAbsenceDto>>> getUserAbsences(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsenceList(searchWrd, pageable)));
    }

    @Operation(summary = "사용자 개별 부재 정보 조회", description = "지정된 한 명의 사용자에 대한 부재 설정 정보를 가져옵니다.")
    @GetMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<UserAbsenceDto>> getUserAbsence(
            @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsence(userId)));
    }

    @Operation(summary = "사용자 부재 정보 설정 및 수정", description = "사용자의 부재 상태를 설정하거나 기존 설정을 수정합니다.")
    @PostMapping("/absence")
    public ResponseEntity<ApiResponse<Void>> saveUserAbsence(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserAbsenceDto dto) {
        vacationService.saveUserAbsence(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "사용자 부재 설정 일괄 삭제", description = "등록된 특정 사용자의 부재 설정을 삭제합니다.")
    @DeleteMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUserAbsence(
            @PathVariable String userId) {
        vacationService.deleteUserAbsence(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
