package com.company.project.api.controller.system.user;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.user.entity.UserAbsence;
import com.company.project.domain.user.repository.UserAbsenceRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "User Absence", description = "사용자 부재 관리 API (Admin)")
@RestController
@RequestMapping("/api/v1/admin/system/user-absences")
@RequiredArgsConstructor
public class UserAbsenceApiController {

    private final UserAbsenceRepository userAbsenceRepository;

    @Operation(summary = "사용자 부재 정보 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserAbsenceDto>>> getAbsences() {
        List<UserAbsenceDto> list = userAbsenceRepository.findAll().stream()
                .map(entity -> UserAbsenceDto.builder()
                        .emplyrId(entity.getEmplyrId())
                        .userAbsnceAt(entity.getUserAbsnceAt())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @Operation(summary = "사용자 부재 상태 상세 조회")
    @GetMapping("/{emplyrId}")
    public ResponseEntity<ApiResponse<UserAbsenceDto>> getAbsence(@PathVariable String emplyrId) {
        UserAbsence absence = userAbsenceRepository.findById(emplyrId)
                .orElse(UserAbsence.builder().emplyrId(emplyrId).userAbsnceAt("N").build());
        return ResponseEntity.ok(ApiResponse.success(UserAbsenceDto.builder()
                .emplyrId(absence.getEmplyrId())
                .userAbsnceAt(absence.getUserAbsnceAt())
                .build()));
    }

    @Operation(summary = "사용자 부재 상태 업데이트")
    @PutMapping("/{emplyrId}")
    public ResponseEntity<ApiResponse<Void>> updateAbsence(
            @PathVariable String emplyrId,
            @RequestBody UserAbsenceDto dto) {
        UserAbsence absence = userAbsenceRepository.findById(emplyrId)
                .orElse(UserAbsence.builder().emplyrId(emplyrId).build());
        absence.updateAbsence(dto.getUserAbsnceAt());
        userAbsenceRepository.save(absence);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Getter
    @Builder
    public static class UserAbsenceDto {
        private String emplyrId;
        private String userAbsnceAt;
    }
}
