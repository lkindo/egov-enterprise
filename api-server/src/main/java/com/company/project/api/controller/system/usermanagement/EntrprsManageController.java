package com.company.project.api.controller.usermanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.user.EgovEntrprsManageService;
import com.company.project.service.user.dto.EnterpriseUserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "EnterpriseMember", description = "湲곗뾽?뚯썝 愿由?API")
@RestController
@RequestMapping("/api/v1/enterprises")
@RequiredArgsConstructor
public class EntrprsManageController {

    private final EgovEntrprsManageService entrprsManageService;

    @Operation(summary = "湲곗뾽?뚯썝 紐⑸줉 議고쉶", description = "?쒖뒪?쒖뿉 ?깅줉??湲곗뾽?뚯썝 紐⑸줉???섏씠吏뺥븯??議고쉶?⑸땲??")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EnterpriseUserDto>>> getEnterprises(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(entrprsManageService.getEntrprsList(keyword, pageable)));
    }

    @Operation(summary = "湲곗뾽?뚯썝 ?곸꽭 議고쉶", description = "?뱀젙 湲곗뾽?뚯썝???곸꽭 ?뺣낫瑜?議고쉶?⑸땲??")
    @GetMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<EnterpriseUserDto>> getEnterprise(
            @Parameter(description = "怨좎쑀 ID") @PathVariable String esntlId) {
        return ResponseEntity.ok(ApiResponse.success(entrprsManageService.getEntrprs(esntlId)));
    }

    @Operation(summary = "湲곗뾽?뚯썝 ?깅줉", description = "?덈줈??湲곗뾽?뚯썝 ?뺣낫瑜??깅줉?⑸땲??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> insertEnterprise(
            @RequestBody EnterpriseUserDto dto) {
        entrprsManageService.insertEntrprs(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "湲곗뾽?뚯썝 ?뺣낫 ?섏젙", description = "湲곗〈 湲곗뾽?뚯썝 ?뺣낫瑜??섏젙?⑸땲??")
    @PutMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> updateEnterprise(
            @PathVariable String esntlId,
            @RequestBody EnterpriseUserDto dto) {
        dto.setEsntlId(esntlId);
        entrprsManageService.updateEntrprs(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "湲곗뾽?뚯썝 ??젣", description = "湲곗뾽?뚯썝 ?뺣낫瑜???젣?⑸땲??")
    @DeleteMapping("/{esntlId}")
    public ResponseEntity<ApiResponse<Void>> deleteEnterprise(
            @PathVariable String esntlId) {
        entrprsManageService.deleteEntrprs(esntlId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "湲곗뾽?뚯썝 鍮꾨?踰덊샇 蹂寃?, description = "湲곗뾽?뚯썝??鍮꾨?踰덊샇瑜?蹂寃쏀빀?덈떎.")
    @PatchMapping("/{esntlId}/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @PathVariable String esntlId,
            @RequestParam String password) {
        entrprsManageService.updatePassword(esntlId, password);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
