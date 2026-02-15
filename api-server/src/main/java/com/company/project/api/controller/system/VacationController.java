package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.VacationService;
import com.company.project.service.system.dto.AnnualLeaveDto;
import com.company.project.service.system.dto.VacationDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Vacation Management", description = "Vacation and Annual Leave Management APIs")
@RestController("systemVacationController")
@RequestMapping("/api/v1/admin/system/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    @Operation(summary = "Get Vacation List")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacationList(
            @RequestParam(required = false) String applcntId,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacationList(applcntId, pageable)));
    }

    @Operation(summary = "Apply for Vacation")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> applyVacation(@RequestBody VacationDto dto) {
        vacationService.applyVacation(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Update Vacation")
    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateVacation(@RequestBody VacationDto dto) {
        vacationService.updateVacation(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Delete Vacation")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        vacationService.deleteVacation(applcntId, vcatnSe, bgnde);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Get Annual Leave List")
    @GetMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<Page<AnnualLeaveDto>>> getAnnualLeaveList(
            @RequestParam(required = false) String occrrncYear,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getAnnualLeaveList(occrrncYear, pageable)));
    }

    @Operation(summary = "Save Annual Leave")
    @PostMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<Void>> saveAnnualLeave(@RequestBody AnnualLeaveDto dto) {
        vacationService.saveAnnualLeave(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
