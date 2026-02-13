package com.company.project.api.controller.ism;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.ism.InfrmlSanctnService;
import com.company.project.service.ism.dto.InfrmlSanctnDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Informal Sanction", description = "Informal Sanction (ISM) Management APIs")
@RestController
@RequestMapping("/api/v1/admin/system/ism")
@RequiredArgsConstructor
public class InfrmlSanctnController {

    private final InfrmlSanctnService infrmlSanctnService;
    private final EgovIdGnrService egovInfrmlSanctnIdGnrService;

    @Operation(summary = "Get Informal Sanction Detail")
    @GetMapping("/{infrmlSanctnId}")
    public ResponseEntity<ApiResponse<InfrmlSanctnDto>> getInfrmlSanctn(@PathVariable String infrmlSanctnId) {
        return ResponseEntity.ok(ApiResponse.success(infrmlSanctnService.getInfrmlSanctn(infrmlSanctnId)));
    }

    @Operation(summary = "Create Informal Sanction")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createInfrmlSanctn(@RequestBody InfrmlSanctnDto dto) throws Exception {
        String id = egovInfrmlSanctnIdGnrService.getNextStringId();
        dto.setInfrmlSanctnId(id);
        // Placeholder for user ID.
        dto.setFrstRegisterId("ADMIN");
        dto.setLastUpdusrId("ADMIN");
        infrmlSanctnService.createInfrmlSanctn(dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "Update Informal Sanction")
    @PutMapping("/{infrmlSanctnId}")
    public ResponseEntity<ApiResponse<Void>> updateInfrmlSanctn(@PathVariable String infrmlSanctnId, @RequestBody InfrmlSanctnDto dto) {
        dto.setInfrmlSanctnId(infrmlSanctnId);
        dto.setLastUpdusrId("ADMIN");
        infrmlSanctnService.updateInfrmlSanctn(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Confirm/Reject Informal Sanction")
    @PatchMapping("/{infrmlSanctnId}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmInfrmlSanctn(
            @PathVariable String infrmlSanctnId,
            @RequestParam String confmAt,
            @RequestParam(required = false) String returnResn) {
        infrmlSanctnService.confirmInfrmlSanctn(infrmlSanctnId, confmAt, returnResn, "ADMIN");
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Delete Informal Sanction")
    @DeleteMapping("/{infrmlSanctnId}")
    public ResponseEntity<ApiResponse<Void>> deleteInfrmlSanctn(@PathVariable String infrmlSanctnId) {
        infrmlSanctnService.deleteInfrmlSanctn(infrmlSanctnId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
