package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.digitalassetmanagement.KnowledgeInf;
import com.company.project.service.digitalassetmanagement.KnowledgePersonalService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
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

@Tag(name = "DigitalAssetPersonal", description = "개인 지식 관리 API")
@RestController
@RequestMapping("/api/v1/digital-assets/personal")
@RequiredArgsConstructor
public class KnowledgePersonalController {

    private final KnowledgePersonalService personalService;

    @Operation(summary = "나의 지식 목록 조회", description = "로그인한 사용자가 등록한 지식 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeInf>>> getPersonalList(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(
                personalService.selectKnowledgePersonalList(searchCondition, searchKeyword, userDetails.getUsername(),
                        pageable)));
    }

    @Operation(summary = "나의 지식 상세 조회", description = "내가 등록한 특정 지식의 상세 정보를 조회합니다.")
    @GetMapping("/{knowledgeId}")
    public ResponseEntity<ApiResponse<KnowledgeDto>> getPersonalDetail(
            @Parameter(description = "지식 ID") @PathVariable String knowledgeId) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(personalService.selectKnowledgePersonalDetail(knowledgeId)));
    }

    @Operation(summary = "지식 등록", description = "새로운 지식을 등록합니다. (파일은 별도 업로드 API 사용)")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createPersonal(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody KnowledgeDto knowledgeDto) throws Exception {
        knowledgeDto.setFirstRegisterId(userDetails.getUsername());
        personalService.insertKnowledgePersonal(knowledgeDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 정보 수정", description = "내가 등록한 지식 정보를 수정합니다.")
    @PutMapping("/{knowledgeId}")
    public ResponseEntity<ApiResponse<Void>> updatePersonal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knowledgeId,
            @RequestBody KnowledgeDto knowledgeDto) throws Exception {
        knowledgeDto.setKnowledgeId(knowledgeId);
        knowledgeDto.setFirstRegisterId(userDetails.getUsername());
        personalService.updateKnowledgePersonal(knowledgeDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 삭제", description = "내가 등록한 지식을 삭제합니다.")
    @DeleteMapping("/{knowledgeId}")
    public ResponseEntity<ApiResponse<Void>> deletePersonal(@PathVariable String knowledgeId) throws Exception {
        personalService.deleteKnowledgePersonal(knowledgeId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
