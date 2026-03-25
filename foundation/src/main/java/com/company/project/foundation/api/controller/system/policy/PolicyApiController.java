package com.company.project.foundation.api.controller.system.policy;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.service.system.policy.PolicyService;
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

    private final PolicyService policyService;

    @Operation(summary = "정책 내용 조회", description = "저작권(copyright) 또는 개인정보보호정책(privacy) 내용을 조회합니다.")
    @GetMapping("/{type}")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPolicy(@PathVariable String type) {
        Map<String, String> result = new HashMap<>();
        result.put("type", type);
        
        policyService.getPolicy(type).ifPresentOrElse(
            policy -> {
                result.put("title", policy.getTitle());
                result.put("content", policy.getContent());
            },
            () -> {
                // 기본값 제공
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
            }
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "정책 내용 수정")
    @PutMapping("/{type}")
    public ResponseEntity<ApiResponse<Void>> updatePolicy(
            @PathVariable String type, 
            @RequestBody Map<String, String> policyMap) {
        
        String title = policyMap.getOrDefault("title", type);
        String content = policyMap.getOrDefault("content", "");
        
        log.info("Updating policy: type={}, title={}, content length={}", type, title, content.length());
        
        policyService.updatePolicy(type, title, content);
        
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
