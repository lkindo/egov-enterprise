package com.company.project.api.controller.code;

import com.company.project.service.code.AdministCodeService;
import com.company.project.service.code.dto.AdministCodeDto;
import com.company.project.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "Administrative Code", description = "행정코드 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/codes/administ")
@RequiredArgsConstructor
public class AdministCodeApiController {

    private final AdministCodeService administCodeService;

    @Operation(summary = "행정코드 목록 조회")
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAdministCodeList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<AdministCodeDto> pageResult = administCodeService.getAdministCodeList(searchWrd, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("list", pageResult.getContent());
        response.put("totalCount", pageResult.getTotalElements());
        response.put("pageIndex", pageIndex);
        response.put("pageUnit", pageUnit);
        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "행정코드 상세 조회")
    @GetMapping("/{code}")
    public ResponseEntity<AdministCodeDto> getAdministCodeDetail(@PathVariable String code) {
        AdministCodeDto dto = administCodeService.getAdministCodeDetail(code);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @Operation(summary = "행정코드 등록")
    @PostMapping
    public ResponseEntity<Map<String, Object>> createAdministCode(@RequestBody AdministCodeDto dto) {
        String userId = getCurrentUserId();
        Map<String, Object> response = new HashMap<>();
        try {
            String newCode = administCodeService.createAdministCode(dto, userId);
            response.put("success", true);
            response.put("code", newCode);
        } catch (Exception e) {
            log.error("Failed to create administ code", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "행정코드 수정")
    @PutMapping("/{code}")
    public ResponseEntity<Map<String, Object>> updateAdministCode(@PathVariable String code, @RequestBody AdministCodeDto dto) {
        String userId = getCurrentUserId();
        Map<String, Object> response = new HashMap<>();
        try {
            administCodeService.updateAdministCode(code, dto, userId);
            response.put("success", true);
        } catch (Exception e) {
            log.error("Failed to update administ code", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "행정코드 삭제")
    @DeleteMapping("/{code}")
    public ResponseEntity<Map<String, Object>> deleteAdministCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            administCodeService.deleteAdministCode(code);
            response.put("success", true);
        } catch (Exception e) {
            log.error("Failed to delete administ code", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getEsntlId();
        }
        return "anonymous";
    }
}
