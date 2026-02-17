package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "System Health", description = "시스템 상태 확인 API")
@RestController
@RequestMapping("/api/v1/health")
public class HealthCheckController {

    @Operation(summary = "Check API Health Status")
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("timestamp", System.currentTimeMillis());
        status.put("version", "5.0.0");
        
        return ResponseEntity.ok(ApiResponse.success(status));
    }
}
