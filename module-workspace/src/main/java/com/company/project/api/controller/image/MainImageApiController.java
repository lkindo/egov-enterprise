package com.company.project.api.controller.image;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.image.EgovMainImageService;
import com.company.project.service.image.dto.MainImageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "MainImage", description = "메인 이미지 관리 API")
@RestController
@RequestMapping("/api/v1/main-images")
@RequiredArgsConstructor
public class MainImageApiController {

    private final EgovMainImageService mainImageService;

    @Operation(summary = "메인 이미지 목록 조회", description = "메인 이미지 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MainImageDto>>> getMainImageList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<MainImageDto> result = mainImageService.getMainImageList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "메인 이미지 상세 조회", description = "특정 메인 이미지의 상세 정보를 조회합니다.")
    @GetMapping("/{imageId}")
    public ResponseEntity<ApiResponse<MainImageDto>> getMainImage(
            @Parameter(description = "이미지 ID") @PathVariable String imageId) {
        return ResponseEntity.ok(ApiResponse.success(mainImageService.getMainImage(imageId)));
    }

    @Operation(summary = "메인 이미지 등록", description = "새로운 메인 이미지를 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertMainImage(@RequestBody MainImageDto dto) {
        mainImageService.insertMainImage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메인 이미지 수정", description = "메인 이미지 정보를 수정합니다.")
    @PutMapping("/{imageId}")
    public ResponseEntity<ApiResponse<Void>> updateMainImage(
            @PathVariable String imageId,
            @RequestBody MainImageDto dto) {
        dto.setImageId(imageId);
        mainImageService.updateMainImage(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메인 이미지 삭제", description = "메인 이미지 정보를 삭제합니다.")
    @DeleteMapping("/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMainImage(@PathVariable String imageId) {
        mainImageService.deleteMainImage(imageId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "반영된 메인 이미지 목록 조회", description = "현재 반영(게시) 중인 메인 이미지 목록을 조회합니다.")
    @GetMapping("/reflected")
    public ResponseEntity<ApiResponse<List<MainImageDto>>> getReflectedMainImages() {
        return ResponseEntity.ok(ApiResponse.success(mainImageService.getReflectedMainImages()));
    }
}
