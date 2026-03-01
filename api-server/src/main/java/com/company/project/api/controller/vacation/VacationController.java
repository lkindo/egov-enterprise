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

@Tag(name = "Vacation (User)", description = "???��? �??�차 관�?API (?�용?�용)")
@RestController
@RequestMapping("/api/v1/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    @Operation(summary = "?�의 ?��? ?�청 목록 조회", description = "?�용??본인???��? ?�청 목록???�이징하??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacations(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(vacationService.getVacationList(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "?��? ?�청 ?�세 조회", description = "?�청???�일 ?��????�세 ?�보�??�인?�니??")
    @GetMapping("/detail")
    public ResponseEntity<ApiResponse<VacationDto>> getVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacation(applcntId, vcatnSe, bgnde)));
    }

    @Operation(summary = "?��? ?�청", description = "?�로???��? ?�청?��? ?�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> requestVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.requestVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?��? ?�청 ?�정", description = "?��?중인 ?��? ?�청 ?�용???�정?�니??")
    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.updateVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?��? ?�청 취소", description = "?�청???��? ?�보�???��(취소)?�니??")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        vacationService.deleteVacation(applcntId, vcatnSe, bgnde);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "본인 ?�차 ?�황 조회", description = "로그?�한 ?�용?�의 ?�해 ?�도 ?�여 ?�차 ?�보�??�인?�니??")
    @GetMapping("/yearly-leaves/my")
    public ResponseEntity<ApiResponse<YearlyLeaveDto>> getMyYearlyLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String occrrncYear) {
        return ResponseEntity
                .ok(ApiResponse.success(vacationService.getYearlyLeave(occrrncYear, userDetails.getUsername())));
    }
}
