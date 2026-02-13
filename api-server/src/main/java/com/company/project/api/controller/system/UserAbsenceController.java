package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.UserAbsenceService;
import com.company.project.service.system.dto.UserAbsenceDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User Absence Management", description = "User Absence Management APIs")
@RestController
@RequestMapping("/api/v1/admin/system/user-absences")
@RequiredArgsConstructor
public class UserAbsenceController {

    private final UserAbsenceService userAbsenceService;

    @Operation(summary = "Get User Absence List")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserAbsenceDto>>> getUserAbsenceList(
            @RequestParam(required = false) String userNm,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(userAbsenceService.getUserAbsenceList(userNm, pageable)));
    }

    @Operation(summary = "Get User Absence Detail")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserAbsenceDto>> getUserAbsence(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(userAbsenceService.getUserAbsence(userId)));
    }

    @Operation(summary = "Save User Absence")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> saveUserAbsence(@RequestBody UserAbsenceDto dto) {
        userAbsenceService.saveUserAbsence(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Delete User Absence")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUserAbsence(@PathVariable String userId) {
        userAbsenceService.deleteUserAbsence(userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
