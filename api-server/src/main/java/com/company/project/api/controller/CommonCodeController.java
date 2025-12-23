package com.company.project.api.controller;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Common Code", description = "Common Code Management APIs")
@RestController
@RequestMapping("/api/v1/codes")
@RequiredArgsConstructor
public class CommonCodeController {

    private final CommonCodeService commonCodeService;

    @Operation(summary = "怨듯넻肄붾뱶 紐⑸줉 議고쉶", description = "?꾩껜 怨듯넻肄붾뱶 紐⑸줉??議고쉶?⑸땲??")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CommonCodeDto>>> getCodes(
            @RequestParam String codeGroupId) {
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.getCodesByGroup(codeGroupId)));
    }

    @Operation(summary = "怨듯넻肄붾뱶 ?깅줉", description = "?덈줈??怨듯넻肄붾뱶瑜??깅줉?⑸땲?? 愿由ъ옄 沅뚰븳???꾩슂?⑸땲??")
    @PostMapping
    public ResponseEntity<ApiResponse<CommonCodeDto>> createCode(
            @Valid @RequestBody CommonCodeSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(commonCodeService.createCode(request)));
    }
}
