package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.digitalassetmanagement.ProfessionalSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeSpecialistService;
import com.company.project.service.digitalassetmanagement.dto.ProfessionalDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "DigitalAssetSpecialist", description = "ÏßÄ???ÑÎ¨∏Í∞Ä Í¥ÄÎ¶?API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/specialists")
@RequiredArgsConstructor
public class KnowledgeSpecialistController {

    private final KnowledgeSpecialistService specialistService;

    @Operation(summary = "?ÑÎ¨∏Í∞Ä Î™©Î°ù Ï°∞Ìöå", description = "?úÏä§?úÏóê ?±Î°ù??ÏßÄ???ÑÎ¨∏Í∞Ä Î™©Î°ù??Ï°∞Ìöå?©Îãà??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProfessionalSearchResult>>> getSpecialistList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                specialistService.selectKnowledgeSpecialistList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "?ÑÎ¨∏Í∞Ä ?ÅÏÑ∏ Ï°∞Ìöå", description = "?πÏ†ï ?ÑÎ¨∏Í∞Ä???ÅÏÑ∏ ?ïÎ≥¥Î•?Ï°∞Ìöå?©Îãà??")
    @GetMapping("/{speId}")
    public ResponseEntity<ApiResponse<ProfessionalDto>> getSpecialistDetail(
            @Parameter(description = "?ÑÎ¨∏Í∞Ä USER ID") @PathVariable String speId,
            @RequestParam String knoTypeCd,
            @RequestParam String appTypeCd) {
        return ResponseEntity.ok(ApiResponse.success(
                specialistService.selectKnowledgeSpecialistDetail(speId, knoTypeCd, appTypeCd)));
    }

    @Operation(summary = "?ÑÎ¨∏Í∞Ä ?±Î°ù", description = "?àÎ°ú??ÏßÄ???ÑÎ¨∏Í∞ÄÎ•??±Î°ù?©Îãà??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createSpecialist(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ProfessionalDto professionalDto) {
        professionalDto.setLastUpdusrId(userDetails.getUsername());
        specialistService.insertKnowledgeSpecialist(professionalDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?ÑÎ¨∏Í∞Ä ?ïÎ≥¥ ?òÏ†ï", description = "?ÑÎ¨∏Í∞Ä??Í≤ΩÎ†• ?ÅÌô© ???ïÎ≥¥Î•??òÏ†ï?©Îãà??")
    @PutMapping("/{speId}")
    public ResponseEntity<ApiResponse<Void>> updateSpecialist(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String speId,
            @RequestBody ProfessionalDto professionalDto) {
        professionalDto.setSpeId(speId);
        professionalDto.setLastUpdusrId(userDetails.getUsername());
        specialistService.updateKnowledgeSpecialist(professionalDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?ÑÎ¨∏Í∞Ä ??†ú", description = "ÏßÄ???ÑÎ¨∏Í∞Ä ?ïÎ≥¥Î•???†ú?©Îãà??")
    @DeleteMapping("/{speId}")
    public ResponseEntity<ApiResponse<Void>> deleteSpecialist(
            @PathVariable String speId,
            @RequestParam String knoTypeCd,
            @RequestParam String appTypeCd) {
        specialistService.deleteKnowledgeSpecialist(speId, knoTypeCd, appTypeCd);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
