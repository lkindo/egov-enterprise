package com.company.project.api.controller.ncm;

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

@Tag(name = "NameCard", description = "Name Card Management APIs")
@RestController
@RequestMapping("/api/v1/name-cards")
@RequiredArgsConstructor
public class NameCardController {

    private final EgovNameCardService nameCardService;

    @Operation(summary = "공개 명함 목록 조회", description = "공개된 명함 목록을 검색합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NameCardDto>>> getNameCardList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(nameCardService.getNameCardList(keyword, pageable)));
    }

    @Operation(summary = "명함 상세 조회", description = "명함의 상세 정보를 조회합니다.")
    @GetMapping("/{ncrdId}")
    public ResponseEntity<ApiResponse<NameCardDto>> getNameCard(
            @Parameter(description = "명함 ID") @PathVariable String ncrdId) {
        return ResponseEntity.ok(ApiResponse.success(nameCardService.getNameCard(ncrdId)));
    }

    @Operation(summary = "명함 등록", description = "새로운 명함을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NameCardDto nameCardDto) {
        String ncrdId = nameCardService.createNameCard(userDetails.getUsername(), nameCardDto);
        return ResponseEntity.ok(ApiResponse.success(ncrdId));
    }

    @Operation(summary = "명함 수정", description = "명함 정보를 수정합니다.")
    @PutMapping("/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> updateNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ncrdId,
            @RequestBody NameCardDto nameCardDto) {
        nameCardService.updateNameCard(ncrdId, userDetails.getUsername(), nameCardDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "명함 삭제", description = "명함을 삭제합니다.")
    @DeleteMapping("/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> deleteNameCard(
            @PathVariable String ncrdId) {
        nameCardService.deleteNameCard(ncrdId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "내 명함첩 목록 조회", description = "내 명함첩(폴더)에 저장된 명함 목록을 조회합니다.")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<NameCardUserDto>>> getMyNameCardFolder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(nameCardService.getMyNameCardFolder(userDetails.getUsername(), pageable)));
    }

    @Operation(summary = "내 명함첩에 명함 추가", description = "특정 명함을 내 명함첩에 저장합니다.")
    @PostMapping("/my/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> addMyNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ncrdId) {
        nameCardService.addMyNameCard(userDetails.getUsername(), ncrdId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "내 명함첩에서 명함 삭제", description = "내 명함첩에서 특정 명함을 삭제(비활성화)합니다.")
    @DeleteMapping("/my/{ncrdId}")
    public ResponseEntity<ApiResponse<Void>> removeMyNameCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ncrdId) {
        nameCardService.removeMyNameCard(userDetails.getUsername(), ncrdId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
