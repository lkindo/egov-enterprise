package com.company.project.api.controller.smarttoolkit;

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

import com.company.project.security.service.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

/**

 * ??      ??REST API Controller

 */

@Slf4j

@RestController

@RequestMapping("/api/v1/scrap")

@RequiredArgsConstructor

public class ScrapController {

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

            return ResponseEntity.status(401).body(Map.of("error", "         ??          ?         ??      ??"));

        }

        try {

            String newId = egovScrapService.createScrap(userId, dto);

            return ResponseEntity.ok(Map.of("success", true, "scrapId", newId, "message", "??      ??      ??      ??      ."));

        } catch (Exception e) {

            log.error("Failed to create scrap: {}", e.getMessage());

            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));

        }

    }

    @DeleteMapping("/{scrapId}")

    public ResponseEntity<Map<String, Object>> deleteScrap(@PathVariable String scrapId) {

        try {

            egovScrapService.deleteScrap(scrapId);

            return ResponseEntity.ok(Map.of("success", true, "message", "??      ??       ?????   ???     ??"));

        } catch (Exception e) {

            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));

        }

    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getEsntlId();
        }
        return "anonymous";
    }

}
