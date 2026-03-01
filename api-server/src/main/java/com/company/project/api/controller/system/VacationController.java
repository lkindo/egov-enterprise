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

@Tag(name = "Vacation (Admin)", description = "?´ê? ë°??°ì°¨ ?µí•© ê´€ë¦?API (ê´€ë¦¬ì??")
@RestController("systemVacationController")
@RequestMapping("/api/v1/admin/system/vacations")
@RequiredArgsConstructor
public class VacationController {

    private final VacationService vacationService;

    @Operation(summary = "?„ì²´ ?´ê? ? ì²­ ëª©ë¡ ì¡°íšŒ", description = "ê´€ë¦¬ìê°€ ?„ì²´ ?¬ìš©?ì˜ ?´ê? ? ì²­ ?´ì—­??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacationList(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacationList(null, searchWrd, pageable)));
    }

    @Operation(summary = "?´ê? ?¹ì¸/ë°˜ë ¤ ì²˜ë¦¬", description = "? ì²­???´ê????€???¹ì¸ ?ëŠ” ë°˜ë ¤ ì²˜ë¦¬ë¥??˜í–‰?©ë‹ˆ??")
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

    @Operation(summary = "?„ì‚¬ ?°ì°¨ ê´€ë¦?ëª©ë¡ ì¡°íšŒ", description = "?¹ì • ?°ë„???¬ìš©?ë³„ ?°ì°¨ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<List<YearlyLeaveDto>>> getAnnualLeaveList(
            @RequestParam String occrrncYear,
            @RequestParam(required = false) String searchWrd) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getYearlyLeaveList(occrrncYear, searchWrd)));
    }

    @Operation(summary = "?°ì°¨ ?•ë³´ ?±ë¡/?˜ì •", description = "?¬ìš©?ì˜ ?°ì°¨ ë°œìƒ???±ì„ ?˜ë™?¼ë¡œ ê´€ë¦¬í•©?ˆë‹¤.")
    @PostMapping("/annual-leaves")
    public ResponseEntity<ApiResponse<Void>> saveAnnualLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody YearlyLeaveDto dto) {
        vacationService.saveYearlyLeave(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?¬ìš©??ë¶€???¤ì • ëª©ë¡ ì¡°íšŒ", description = "?œìŠ¤?????„ì²´ ?¬ìš©??ë¶€???¤ì •??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/absence")
    public ResponseEntity<ApiResponse<Page<UserAbsenceDto>>> getUserAbsences(
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsenceList(searchWrd, pageable)));
    }

    @Operation(summary = "?¬ìš©??ë¶€???¤ì • ?ì„¸ ì¡°íšŒ", description = "?¹ì • ?¬ìš©?ì˜ ë¶€???¤ì • ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<UserAbsenceDto>> getUserAbsence(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsence(userId)));
    }

    @Operation(summary = "?¬ìš©??ë¶€???ì—­ ?¤ì •", description = "?¹ì • ?¬ìš©?ì˜ ë¶€???íƒœë¥?ê°•ì œ ?¤ì •?˜ê±°???˜ì •?©ë‹ˆ??")
    @PostMapping("/absence")
    public ResponseEntity<ApiResponse<Void>> saveUserAbsence(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UserAbsenceDto dto) {
        vacationService.saveUserAbsence(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?¬ìš©??ë¶€???¤ì • ?? œ", description = "?¬ìš©?ì˜ ë¶€???¤ì •??ì´ˆê¸°???? œ)?©ë‹ˆ??")
    @DeleteMapping("/absence/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUserAbsence(@PathVariable String userId) {
        vacationService.deleteUserAbsence(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
