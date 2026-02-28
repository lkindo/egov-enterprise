package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.dam.ProfessionalSearchResult;
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

@Tag(name = "DigitalAssetSpecialist", description = "지식 전문가 관리 API")
@RestController
@RequestMapping("/api/v1/admin/digital-assets/specialists")
@RequiredArgsConstructor
public class KnowledgeSpecialistController {

    private final KnowledgeSpecialistService specialistService;

    @Operation(summary = "전문가 목록 조회", description = "시스템에 등록된 지식 전문가 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProfessionalSearchResult>>> getSpecialistList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                specialistService.selectKnowledgeSpecialistList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "전문가 상세 조회", description = "특정 전문가의 상세 정보를 조회합니다.")
    @GetMapping("/{speId}")
    public ResponseEntity<ApiResponse<ProfessionalDto>> getSpecialistDetail(
            @Parameter(description = "전문가 USER ID") @PathVariable String speId,
            @RequestParam String knoTypeCd,
            @RequestParam String appTypeCd) {
        return ResponseEntity.ok(ApiResponse.success(
                specialistService.selectKnowledgeSpecialistDetail(speId, knoTypeCd, appTypeCd)));
    }

    @Operation(summary = "전문가 등록", description = "새로운 지식 전문가를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createSpecialist(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ProfessionalDto professionalDto) {
        professionalDto.setLastUpdusrId(userDetails.getUsername());
        specialistService.insertKnowledgeSpecialist(professionalDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "전문가 정보 수정", description = "전문가의 경력 상황 등 정보를 수정합니다.")
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

    @Operation(summary = "전문가 삭제", description = "지식 전문가 정보를 삭제합니다.")
    @DeleteMapping("/{speId}")
    public ResponseEntity<ApiResponse<Void>> deleteSpecialist(
            @PathVariable String speId,
            @RequestParam String knoTypeCd,
            @RequestParam String appTypeCd) {
        specialistService.deleteKnowledgeSpecialist(speId, knoTypeCd, appTypeCd);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
