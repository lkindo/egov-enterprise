package com.company.project.api.controller.terms;

import com.company.project.security.service.CustomUserDetails;
import com.company.project.core.response.ApiResponse;
import com.company.project.service.terms.TermsService;
import com.company.project.service.terms.dto.TermsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@Tag(name = "Terms", description = "?? 관?API")
@RestController
@RequestMapping("/api/v1/admin/terms")
@RequiredArgsConstructor
public class TermsApiController {

    private final TermsService termsService;

    @Operation(summary = "?? 목록 조회")
    @GetMapping
    public ResponseEntity<?> getTermsList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<TermsDto> result = termsService.getTermsList(pageable);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "?? ?세 조회")
    @GetMapping("/{useStplatId}")
    public ResponseEntity<?> getTermsDetail(@PathVariable String useStplatId) {
        return ResponseEntity.ok(ApiResponse.success(termsService.getTerms(useStplatId)));
    }

    @Operation(summary = "?? ?록")
    @PostMapping
    public ResponseEntity<?> createTerms(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody TermsDto vo) {
        String id = termsService.createTerms(userDetails.getEsntlId(), vo);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "?? ?정")
    @PutMapping("/{useStplatId}")
    public ResponseEntity<?> updateTerms(
            @PathVariable String useStplatId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody TermsDto vo) {
        termsService.updateTerms(useStplatId, userDetails.getEsntlId(), vo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?? ??")
    @DeleteMapping("/{useStplatId}")
    public ResponseEntity<?> deleteTerms(
            @PathVariable String useStplatId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        termsService.deleteTerms(useStplatId, userDetails.getEsntlId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
