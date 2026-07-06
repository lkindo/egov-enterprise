package nuri.api.controller.foundation.controller.system.user;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.service.system.user.UserAbsenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "User Absence", description = "사용자 부재 관리 API (Admin)")
@RestController
@RequestMapping("/api/v1/admin/system/user-absences")
@RequiredArgsConstructor
public class UserAbsenceApiController {

    private final UserAbsenceService userAbsenceService;

    @Operation(summary = "사용자 부재 정보 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserAbsenceDto>>> getAbsences() {
        return ResponseEntity.ok(ApiResponse.success(userAbsenceService.getAbsences()));
    }

    @Operation(summary = "사용자 부재 상태 상세 조회")
    @GetMapping("/{emplyrId}")
    public ResponseEntity<ApiResponse<UserAbsenceDto>> getAbsence(@PathVariable String emplyrId) {
        return ResponseEntity.ok(ApiResponse.success(userAbsenceService.getAbsence(emplyrId)));
    }

    @Operation(summary = "사용자 부재 상태 업데이트")
    @PutMapping("/{emplyrId}")
    public ResponseEntity<ApiResponse<Void>> updateAbsence(
            @PathVariable String emplyrId,
            @Valid @RequestBody UserAbsenceDto dto) {
        userAbsenceService.updateAbsence(emplyrId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
