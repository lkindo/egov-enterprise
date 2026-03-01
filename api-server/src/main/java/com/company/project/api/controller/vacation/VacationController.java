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

@Tag(name = "Vacation (User)", description = "???´ê? ë°??°ì°¨ ê´€ë¦?API (?¬ìš©?ìš©)")
@RestController
@RequestMapping("/api/v1/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    @Operation(summary = "?˜ì˜ ?´ê? ? ì²­ ëª©ë¡ ì¡°íšŒ", description = "?¬ìš©??ë³¸ì¸???´ê? ? ì²­ ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacations(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(vacationService.getVacationList(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "?´ê? ? ì²­ ?ì„¸ ì¡°íšŒ", description = "? ì²­???¨ì¼ ?´ê????ì„¸ ?•ë³´ë¥??•ì¸?©ë‹ˆ??")
    @GetMapping("/detail")
    public ResponseEntity<ApiResponse<VacationDto>> getVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacation(applcntId, vcatnSe, bgnde)));
    }

    @Operation(summary = "?´ê? ? ì²­", description = "?ˆë¡œ???´ê? ? ì²­?œë? ?±ë¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> requestVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.requestVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?´ê? ? ì²­ ?˜ì •", description = "?€ê¸?ì¤‘ì¸ ?´ê? ? ì²­ ?´ìš©???˜ì •?©ë‹ˆ??")
    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateVacation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VacationDto dto) {
        vacationService.updateVacation(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?´ê? ? ì²­ ì·¨ì†Œ", description = "? ì²­???´ê? ?•ë³´ë¥??? œ(ì·¨ì†Œ)?©ë‹ˆ??")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteVacation(
            @RequestParam String applcntId,
            @RequestParam String vcatnSe,
            @RequestParam String bgnde) {
        vacationService.deleteVacation(applcntId, vcatnSe, bgnde);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ë³¸ì¸ ?°ì°¨ ?„í™© ì¡°íšŒ", description = "ë¡œê·¸?¸í•œ ?¬ìš©?ì˜ ?¹í•´ ?°ë„ ?”ì—¬ ?°ì°¨ ?•ë³´ë¥??•ì¸?©ë‹ˆ??")
    @GetMapping("/yearly-leaves/my")
    public ResponseEntity<ApiResponse<YearlyLeaveDto>> getMyYearlyLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String occrrncYear) {
        return ResponseEntity
                .ok(ApiResponse.success(vacationService.getYearlyLeave(occrrncYear, userDetails.getUsername())));
    }
}
