package com.company.project.api.controller.system.policy;

import com.company.project.core.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 시스템 정책 및 약관 관리를 위한 API 컨트롤러
 */
@Tag(name = "Policy Management", description = "시스템 정책/약관 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/policies")
@RequiredArgsConstructor
public class PolicyApiController {

    @Operation(summary = "정책 내용 조회", description = "저작권(copyright) 또는 개인정보보호정책(privacy) 내용을 조회합니다.")
    @GetMapping("/{type}")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPolicy(@PathVariable String type) {
        Map<String, String> result = new HashMap<>();
        result.put("type", type);
        
        // TODO: 실제 DB 또는 파일에서 정책 내용을 로드하도록 보완 필요
        if ("copyright".equalsIgnoreCase(type)) {
            result.put("title", "저작권 보호 정책");
            result.put("content", "본 시스템의 모든 콘텐츠는 저작권법의 보호를 받습니다.");
        } else if ("privacy".equalsIgnoreCase(type)) {
            result.put("title", "개인정보 처리 방침");
            result.put("content", "본 시스템은 사용자의 개인정보를 소중히 다루며, 관련 법규를 준수합니다.");
        } else {
            result.put("title", "기타 정책");
            result.put("content", "준비 중인 정책 페이지입니다.");
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "정책 내용 수정")
    @PutMapping("/{type}")
    public ResponseEntity<ApiResponse<Void>> updatePolicy(
            @PathVariable String type, 
            @RequestBody Map<String, String> policyMap) {
        log.info("Updating policy: type={}, content length={}", type, 
                policyMap.getOrDefault("content", "").length());
        
        // TODO: 저장 로직 구현
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
