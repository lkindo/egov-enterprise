package com.company.project.api.controller.digitalassetmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.dam.KnowledgeRequest;
import com.company.project.service.digitalassetmanagement.KnowledgeRequestService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeRequestDto;
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

@Tag(name = "DigitalAssetRequest", description = "지식 요청 관리 API")
@RestController
@RequestMapping("/api/v1/digital-assets/requests")
@RequiredArgsConstructor
public class KnowledgeRequestController {

    private final KnowledgeRequestService requestService;

    @Operation(summary = "지식 요청 목록 조회", description = "사용자들이 등록한 지식 요청 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeRequest>>> getRequestList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(
                requestService.selectKnowledgeRequestList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "지식 요청 상세 조회", description = "특정 지식 요청의 상세 정보를 조회합니다.")
    @GetMapping("/{knoId}")
    public ResponseEntity<ApiResponse<KnowledgeRequestDto>> getRequestDetail(
            @Parameter(description = "지식 요청 ID") @PathVariable String knoId) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(requestService.selectKnowledgeRequestDetail(knoId)));
    }

    @Operation(summary = "지식 요청 등록", description = "새로운 지식 요청을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody KnowledgeRequestDto requestDto) throws Exception {
        requestDto.setFrstRegisterId(userDetails.getUsername());
        requestDto.setEmplyrId(userDetails.getUsername());
        requestService.insertKnowledgeRequest(requestDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 요청 수정", description = "내가 등록한 지식 요청 정보를 수정합니다.")
    @PutMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> updateRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String knoId,
            @RequestBody KnowledgeRequestDto requestDto) throws Exception {
        requestDto.setKnoId(knoId);
        requestDto.setLastUpdusrId(userDetails.getUsername());
        requestService.updateKnowledgeRequest(requestDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "지식 요청 삭제", description = "내가 등록한 지식 요청을 삭제합니다. (답변이 있는 경우 삭제 불가)")
    @DeleteMapping("/{knoId}")
    public ResponseEntity<ApiResponse<Void>> deleteRequest(@PathVariable String knoId) throws Exception {
        if (requestService.getReplyCount(knoId) > 0) {
            throw new IllegalStateException("답변이 등록된 요청은 삭제할 수 없습니다.");
        }
        requestService.deleteKnowledgeRequest(knoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
