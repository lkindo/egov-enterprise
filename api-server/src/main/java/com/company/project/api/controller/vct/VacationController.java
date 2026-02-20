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

@Operation(summary = "??? ?                      ?         ??", description = "??? ?          ??      ????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<VacationDto>>> getVacations(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(

                ApiResponse.success(vacationService.getVacationList(userDetails.getUsername(), searchWrd, pageable)));

    }

@Operation(summary = "?          ???             ?         ??(?     ?         )", description = "?     ?                      ??                   ?????   ?    ??? ?          ??      ??         ???      ??")

    @GetMapping("/admin/all")

    public ResponseEntity<ApiResponse<Page<VacationDto>>> getAllVacations(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(

                ApiResponse.success(vacationService.getVacationList(null, searchWrd, pageable)));

    }

@Operation(summary = "??? ?                   ??", description = "?     ????? ?          ?          ?         ??         ???      ??")

    @GetMapping("/detail")

    public ResponseEntity<ApiResponse<VacationDto>> getVacation(

            @RequestParam String applcntId,

            @RequestParam String vcatnSe,

            @RequestParam String bgnde) {

        return ResponseEntity.ok(ApiResponse.success(vacationService.getVacation(applcntId, vcatnSe, bgnde)));

    }

@Operation(summary = "??? ?         ", description = "??      ????????         ??      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> requestVacation(

            @AuthenticationPrincipal UserDetails userDetails,

            @Valid @RequestBody VacationDto dto) {

        vacationService.requestVacation(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??? ?          ??      ", description = "         ????? ?          ??      ????      ??      ??")

    @PutMapping

    public ResponseEntity<ApiResponse<Void>> updateVacation(

            @AuthenticationPrincipal UserDetails userDetails,

            @Valid @RequestBody VacationDto dto) {

        vacationService.updateVacation(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??? ?          ????", description = "??? ?          ??      ???????      ??")

    @DeleteMapping

    public ResponseEntity<ApiResponse<Void>> deleteVacation(

            @RequestParam String applcntId,

            @RequestParam String vcatnSe,

            @RequestParam String bgnde) {

        vacationService.deleteVacation(applcntId, vcatnSe, bgnde);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??? ?     ??         ??", description = "??? ?         ???     ???      ??         ???      ??")

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

@Operation(summary = "?          ?                      ?         ??", description = "?     ???         ??????   ?  ??          ?         ??         ???      ??")

    @GetMapping("/yearly-leaves")

    public ResponseEntity<ApiResponse<List<YearlyLeaveDto>>> getYearlyLeaves(

            @RequestParam String occrrncYear,

            @RequestParam(required = false) String searchWrd) {

        return ResponseEntity.ok(ApiResponse.success(vacationService.getYearlyLeaveList(occrrncYear, searchWrd)));

    }

@Operation(summary = "         ???          ?                   ??", description = "?     ???         ?????          ?         ??         ???      ??")

    @GetMapping("/yearly-leaves/my")

    public ResponseEntity<ApiResponse<YearlyLeaveDto>> getMyYearlyLeave(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam String occrrncYear) {

        return ResponseEntity

                .ok(ApiResponse.success(vacationService.getYearlyLeave(occrrncYear, userDetails.getUsername())));

    }

@Operation(summary = "?          ?          ????", description = "????   ?    ?          ?         ???         ??      ????      ??      ??")

    @PostMapping("/yearly-leaves")

    public ResponseEntity<ApiResponse<Void>> saveYearlyLeave(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody YearlyLeaveDto dto) {

        vacationService.saveYearlyLeave(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- User Absence ---

@Operation(summary = "??????     ??            ?         ??", description = "??????     ????       ??      ????                  ??         ???      ??")

    @GetMapping("/absence")

    public ResponseEntity<ApiResponse<Page<UserAbsenceDto>>> getUserAbsences(

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsenceList(searchWrd, pageable)));

    }

@Operation(summary = "??????     ???                   ??", description = "?     ??????   ?    ?     ????       ?         ??         ???      ??")

    @GetMapping("/absence/{userId}")

    public ResponseEntity<ApiResponse<UserAbsenceDto>> getUserAbsence(

            @PathVariable String userId) {

        return ResponseEntity.ok(ApiResponse.success(vacationService.getUserAbsence(userId)));

    }

@Operation(summary = "??????     ???          ????", description = "????   ?    ?     ????       ?         ???         ??      ????      ??      ??")

    @PostMapping("/absence")

    public ResponseEntity<ApiResponse<Void>> saveUserAbsence(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody UserAbsenceDto dto) {

        vacationService.saveUserAbsence(userDetails.getUsername(), dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??????     ???          ????", description = "????   ?    ?     ????       ?         ???????      ??")

    @DeleteMapping("/absence/{userId}")

    public ResponseEntity<ApiResponse<Void>> deleteUserAbsence(

            @PathVariable String userId) {

        vacationService.deleteUserAbsence(userId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

