package com.company.project.api.controller.namecardmanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.namecard.EgovNameCardService;
import com.company.project.service.namecard.dto.NameCardDto;
import com.company.project.service.namecard.dto.NameCardUserDto;
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

@Tag(name = "NameCard", description = "명함 관�?API")
@RestController
@RequestMapping("/api/v1/name-cards")
@RequiredArgsConstructor
public class NameCardController {

    private final EgovNameCardService nameCardService;

    @Operation(summary = "명함 목록 조회", description = "?�스?�에 ?�록???�체 명함 목록??조회?�니??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NameCardDto>>> getNameCardList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(nameCardService.getNameCardList(keyword, pageable)));
    }

    @Operation(summary = "명함 ?�세 조회", description = "?�정 명함???�세 ?�보�?조회?�니??")
    @GetMapping("/{ncrdId}")
    public ResponseEntity<ApiResponse<NameCardDto>> getNameCard(
            @Parameter(description = "명함 ID") @PathVariable String ncrdId) {
        return ResponseEntity.ok(ApiResponse.success(nameCardService.getNameCard(ncrdId)));
    }

    @Operation(summary = "명함 ?�록", description = "?�로??명함???�록?�니??")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NameCardDto nameCardDto) {
        String ncrdId = nameCardService.createNameCard(userDetails.getUsername(), nameCardDto);
        return ResponseEntity.ok(ApiResponse.success(ncrdId));
    }

    @Operation(summary = "명함 ?�보 ?�정", description = "?�록??명함???�보�??�정?�니??")
    @PutMapping("/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> updateNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ncrdId,
            @RequestBody NameCardDto nameCardDto) {
        nameCardService.updateNameCard(ncrdId, userDetails.getUsername(), nameCardDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "명함 ??��", description = "?�록??명함????��?�니??")
    @DeleteMapping("/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> deleteNameCard(
            @PathVariable String ncrdId) {
        nameCardService.deleteNameCard(ncrdId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�의 명함�?조회", description = "로그?�한 ?�용?�의 개인 명함첩에 ?�긴 명함 목록??조회?�니??")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<NameCardUserDto>>> getMyNameCardFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity
                .ok(ApiResponse.success(nameCardService.getMyNameCardFolder(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "?�의 명함첩에 명함 추�?", description = "?�체 명함 �??�정 명함???�의 명함첩에 추�??�니??")
    @PostMapping("/my/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> addMyNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ncrdId) {
        nameCardService.addMyNameCard(userDetails.getUsername(), ncrdId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?�의 명함첩에??명함 ??��", description = "?�의 명함첩에 보�? 중인 명함???�의 명함첩에???�거?�니??")
    @DeleteMapping("/my/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> removeMyNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ncrdId) {
        nameCardService.removeMyNameCard(userDetails.getUsername(), ncrdId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
