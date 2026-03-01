package com.company.project.api.controller.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.user.EgovMberManageService;
import com.company.project.service.user.dto.GeneralUserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "GeneralMember", description = "?쇰컲?뚯썝 愿由?API")
@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MberManageController {

    private final EgovMberManageService mberManageService;

    @Operation(summary = "?쇰컲?뚯썝 紐⑸줉 議고쉶", description = "?쒖뒪?쒖뿉 ?깅줉???쇰컲?뚯썝 紐⑸줉???섏씠吏뺥븯??議고쉶?⑸땲??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<GeneralUserDto>>> getMembers(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(mberManageService.getMberList(keyword, pageable)));
    }

    @Operation(summary = "?쇰컲?뚯썝 ?곸꽭 議고쉶", description = "?뱀젙 ?쇰컲?뚯썝???곸꽭 ?뺣낫瑜?議고쉶?⑸땲??")
    @GetMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<GeneralUserDto>> getMember(
            @Parameter(description = "怨좎쑀 ID") @PathVariable String esntlId) {
        return ResponseEntity.ok(ApiResponse.success(mberManageService.getMber(esntlId)));
    }

    @Operation(summary = "?쇰컲?뚯썝 ?깅줉", description = "?덈줈???쇰컲?뚯썝 ?뺣낫瑜??깅줉?⑸땲??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertMember(
            @RequestBody GeneralUserDto dto) {
        mberManageService.insertMber(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?쇰컲?뚯썝 ?뺣낫 ?섏젙", description = "湲곗〈 ?쇰컲?뚯썝 ?뺣낫瑜??섏젙?⑸땲??")
    @PutMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> updateMember(
            @PathVariable String esntlId,
            @RequestBody GeneralUserDto dto) {
        dto.setEsntlId(esntlId);
        mberManageService.updateMber(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?쇰컲?뚯썝 ??젣", description = "?쇰컲?뚯썝 ?뺣낫瑜???젣?⑸땲??")
    @DeleteMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> deleteMember(
            @PathVariable String esntlId) {
        mberManageService.deleteMber(esntlId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "?쇰컲?뚯썝 鍮꾨?踰덊샇 蹂寃?, description = "?쇰컲?뚯썝??鍮꾨?踰덊샇瑜?蹂寃쏀빀?덈떎.")
    @PatchMapping("/{esntlId}/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @PathVariable String esntlId,
            @RequestParam String password) {
        mberManageService.updatePassword(esntlId, password);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
