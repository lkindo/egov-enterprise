package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.AnniversaryService;
import com.company.project.service.system.dto.AnniversaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Anniversary Management", description = "Personal/General Anniversary Management APIs")
@RestController
@RequestMapping("/api/v1/admin/system/anniversaries")
@RequiredArgsConstructor
public class AnniversaryController {

    private final AnniversaryService anniversaryService;
    private final EgovIdGnrService egovAnnvrsryIdGnrService;

    @Operation(summary = "Get Anniversary List")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AnniversaryDto>>> getAnniversaryList(
            @RequestParam(required = false) String annvrsryNm,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversaryList(annvrsryNm, pageable)));
    }

    @Operation(summary = "Get Anniversary Detail")
    @GetMapping("/{annId}")
    public ResponseEntity<ApiResponse<AnniversaryDto>> getAnniversary(@PathVariable String annId) {
        return ResponseEntity.ok(ApiResponse.success(anniversaryService.getAnniversary(annId)));
    }

    @Operation(summary = "Create Anniversary")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createAnniversary(@RequestBody AnniversaryDto dto) throws Exception {
        String id = egovAnnvrsryIdGnrService.getNextStringId();
        dto.setAnnId(id);
        anniversaryService.createAnniversary(dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "Update Anniversary")
    @PutMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> updateAnniversary(@PathVariable String annId, @RequestBody AnniversaryDto dto) {
        dto.setAnnId(annId);
        anniversaryService.updateAnniversary(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Delete Anniversary")
    @DeleteMapping("/{annId}")
    public ResponseEntity<ApiResponse<Void>> deleteAnniversary(@PathVariable String annId) {
        anniversaryService.deleteAnniversary(annId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
