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

import org.springframework.web.bind.annotation.PutMapping;

import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.bind.annotation.RestController;

import com.company.project.service.deptjob.EgovDeptJobBoxService;

import com.company.project.service.deptjob.dto.DeptJobBoxDto;

import com.company.project.security.service.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

/**

 * ?     ??      ?         ?REST API Controller

 * 

 * Next.js ?         ?         ??      ???????       ?          JSON             ?REST API ??      

 */

@Slf4j

@RestController

@RequestMapping("/api/v1/deptjob")

@RequiredArgsConstructor

public class DeptJobApiController {

    private final EgovDeptJobBoxService egovDeptJobBoxService;

    /**

     * ?     ??      ?         ?            ?         ??

     */

    @GetMapping("/boxes")

    public ResponseEntity<Map<String, Object>> getDeptJobBoxList(

            @RequestParam(defaultValue = "") String searchWrd,

            @RequestParam(defaultValue = "") String deptId,

            @RequestParam(defaultValue = "1") int pageIndex,

            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);

        Page<DeptJobBoxDto> pageResult;

        if (deptId != null && !deptId.isEmpty()) {

            pageResult = egovDeptJobBoxService.getDeptJobBoxListByDept(deptId, pageable);

        } else {

            pageResult = egovDeptJobBoxService.getDeptJobBoxList(searchWrd, pageable);

        }

        Map<String, Object> response = new HashMap<>();

        response.put("resultList", pageResult.getContent());

        response.put("totalCount", pageResult.getTotalElements());

        response.put("pageIndex", pageIndex);

        response.put("pageUnit", pageUnit);

        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);

    }

    /**

     * ?     ??      ?         ??                   ??

     */

    @GetMapping("/boxes/{deptJobbxId}")

    public ResponseEntity<Map<String, Object>> getDeptJobBox(@PathVariable String deptJobbxId) {

        DeptJobBoxDto dto = egovDeptJobBoxService.getDeptJobBox(deptJobbxId);

        if (dto == null) {

            return ResponseEntity.notFound().build();

        }

        Map<String, Object> response = new HashMap<>();

        response.put("deptJobBox", dto);

        return ResponseEntity.ok(response);

    }

    /**

     * ?     ??      ?         ??         

     */

    @PostMapping("/boxes")

    public ResponseEntity<Map<String, Object>> createDeptJobBox(@RequestBody DeptJobBoxDto dto) {

        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {

            return ResponseEntity.status(401).body(Map.of("error", "         ??          ?         ??      ??"));

        }

        Map<String, Object> response = new HashMap<>();

        try {

            String newId = egovDeptJobBoxService.createDeptJobBox(userId, dto);

            response.put("success", true);

            response.put("message", "?     ??      ?         ???         ??   ???     ??");

            response.put("deptJobbxId", newId);

        } catch (Exception e) {

            log.error("Failed to create dept job box: {}", e.getMessage());

            response.put("success", false);

            response.put("message", "?         ????      ??      ??      : " + e.getMessage());

            return ResponseEntity.badRequest().body(response);

        }

        return ResponseEntity.ok(response);

    }

    /**

     * ?     ??      ?         ???      

     */

    @PutMapping("/boxes/{deptJobbxId}")

    public ResponseEntity<Map<String, Object>> updateDeptJobBox(

            @PathVariable String deptJobbxId,

            @RequestBody DeptJobBoxDto dto) {

        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {

            return ResponseEntity.status(401).body(Map.of("error", "         ??          ?         ??      ??"));

        }

        Map<String, Object> response = new HashMap<>();

        try {

            egovDeptJobBoxService.updateDeptJobBox(deptJobbxId, userId, dto);

            response.put("success", true);

            response.put("message", "?     ??      ?         ????      ??   ???     ??");

        } catch (Exception e) {

            log.error("Failed to update dept job box: {}", e.getMessage());

            response.put("success", false);

            response.put("message", "??      ????      ??      ??      : " + e.getMessage());

            return ResponseEntity.badRequest().body(response);

        }

        return ResponseEntity.ok(response);

    }

    /**

     * ?     ??      ?         ?????

     */

    @DeleteMapping("/boxes/{deptJobbxId}")

    public ResponseEntity<Map<String, Object>> deleteDeptJobBox(@PathVariable String deptJobbxId) {

        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {

            return ResponseEntity.status(401).body(Map.of("error", "         ??          ?         ??      ??"));

        }

        Map<String, Object> response = new HashMap<>();

        try {

            egovDeptJobBoxService.deleteDeptJobBox(deptJobbxId);

            response.put("success", true);

            response.put("message", "?     ??      ?         ???????   ???     ??");

        } catch (Exception e) {

            log.error("Failed to delete dept job box: {}", e.getMessage());

            response.put("success", false);

            response.put("message", "???????      ??      ??      : " + e.getMessage());

            return ResponseEntity.badRequest().body(response);

        }

        return ResponseEntity.ok(response);

    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getEsntlId();
        }
        return "anonymous";
    }

}

