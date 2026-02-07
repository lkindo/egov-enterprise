package com.company.project.web.api;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.company.project.service.scrap.EgovScrapService;
import com.company.project.service.scrap.dto.ScrapDto;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 스크랩 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/scrap")
@RequiredArgsConstructor
public class ScrapApiController {

    private final EgovScrapService egovScrapService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyScrapList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {
        String userId = getCurrentUserId();
        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<ScrapDto> pageResult = egovScrapService.getMyScrapList(userId, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("resultList", pageResult.getContent());
        response.put("totalCount", pageResult.getTotalElements());
        response.put("pageIndex", pageIndex);
        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{scrapId}")
    public ResponseEntity<Map<String, Object>> getScrap(@PathVariable String scrapId) {
        ScrapDto dto = egovScrapService.getScrap(scrapId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("scrap", dto));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createScrap(@RequestBody ScrapDto dto) {
        String userId = getCurrentUserId();
        if (userId.equals("anonymous")) {
            return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다."));
        }

        try {
            String newId = egovScrapService.createScrap(userId, dto);
            return ResponseEntity.ok(Map.of("success", true, "scrapId", newId, "message", "스크랩되었습니다."));
        } catch (Exception e) {
            log.error("Failed to create scrap: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{scrapId}")
    public ResponseEntity<Map<String, Object>> deleteScrap(@PathVariable String scrapId) {
        try {
            egovScrapService.deleteScrap(scrapId);
            return ResponseEntity.ok(Map.of("success", true, "message", "스크랩이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private String getCurrentUserId() {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        return (user != null) ? user.getUniqId() : "anonymous";
    }
}
