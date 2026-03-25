package com.company.project.business.api.controller.operation;

import com.company.project.foundation.core.response.ApiResponse;
import com.company.project.foundation.service.operation.ExternalHrService;
import com.company.project.foundation.service.operation.dto.ExternalHrDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/operation/external-hr")
@RequiredArgsConstructor
public class ExternalHrApiController {

    private final ExternalHrService externalHrService;

    @GetMapping
    public ResponseEntity<?> getAllExternalHr(@RequestParam(required = false) String name) {
        if (name != null && !name.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(externalHrService.searchByName(name)));
        }
        return ResponseEntity.ok(ApiResponse.success(externalHrService.getAllExternalHr()));
    }

    @PostMapping
    public ResponseEntity<?> createExternalHr(@RequestBody ExternalHrDto dto) {
        return ResponseEntity.ok(ApiResponse.success(externalHrService.createExternalHr(dto)));
    }
}
