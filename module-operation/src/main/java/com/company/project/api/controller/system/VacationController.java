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

@Tag(name = "Vacation (Admin)", description = "?? ??차 ?합 관?API (관리자??")
@RestController("systemVacationController")
@RequestMapping("/api/v1/admin/system/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    @Operation(summary = "?체 ?? ?청 목록 조회", description = "관리자가 ?체 ?용?의 ?? ?청 ?역??조회?니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacationList(null, searchWrd, pageable)));
    }

    @Operation(summary = "?? ?인/반려 처리", description = "?청??????????인 ?는 반려 처리??행?니??")
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

    @Operation(summary = "?사 ?차 관?목록 조회", description = "?정 ?도???용?별 ?차 ?보?조회?니??")
    @GetMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<List<YearlyLeaveDto>>> getAnnualLeaveList(
            @RequestParam String occrrncYear,
            @RequestParam(required = false) String searchWrd) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getYearlyLeaveList(occrrncYear, searchWrd)));
    }

    @Operation(summary = "?차 ?보 ?록/?정", description = "?용?의 ?차 발생???을 ?동?로 관리합?다.")
    @PostMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<Void>> saveAnnualLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody YearlyLeaveDto dto) {
        vacationService.saveYearlyLeave(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?용??부???정 목록 조회", description = "?스?????체 ?용??부???정??조회?니??")
    @GetMapping("/absence")
    public ResponseEntity<ApiResponse<Page<UserAbsenceDto>>> getUserAbsences(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsenceList(searchWrd, pageable)));
    }

    @Operation(summary = "?용??부???정 ?세 조회", description = "?정 ?용?의 부???정 ?보?조회?니??")
    @GetMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<UserAbsenceDto>> getUserAbsence(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsence(userId)));
    }

    @Operation(summary = "?용??부???역 ?정", description = "?정 ?용?의 부???태?강제 ?정?거???정?니??")
    @PostMapping("/absence")
    public ResponseEntity<ApiResponse<Void>> saveUserAbsence(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UserAbsenceDto dto) {
        vacationService.saveUserAbsence(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?용??부???정 ??", description = "?용?의 부???정??초기????)?니??")
    @DeleteMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUserAbsence(@PathVariable String userId) {
        vacationService.deleteUserAbsence(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
