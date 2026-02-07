package com.company.project.web.api;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

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
import com.company.project.web.adapter.DeptJobBoxAdapter;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 부서업무함 REST API Controller
 * 
 * Next.js 프론트엔드에서 사용하기 위한 JSON 기반 REST API 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/deptjob")
@RequiredArgsConstructor
public class DeptJobApiController {

    private final EgovDeptJobBoxService egovDeptJobBoxService;

    /**
     * 부서업무함 목록 조회
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
        response.put("resultList", DeptJobBoxAdapter.toVOList(pageResult.getContent()));
        response.put("totalCount", pageResult.getTotalElements());
        response.put("pageIndex", pageIndex);
        response.put("pageUnit", pageUnit);
        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);
    }

    /**
     * 부서업무함 상세 조회
     */
    @GetMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<Map<String, Object>> getDeptJobBox(@PathVariable String deptJobbxId) {
        DeptJobBoxDto dto = egovDeptJobBoxService.getDeptJobBox(deptJobbxId);

        if (dto == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("deptJobBox", DeptJobBoxAdapter.toVO(dto));

        return ResponseEntity.ok(response);
    }

    /**
     * 부서업무함 등록
     */
    @PostMapping("/boxes")
    public ResponseEntity<Map<String, Object>> createDeptJobBox(@RequestBody DeptJobBoxDto dto) {
        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {
            return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다."));
        }

        Map<String, Object> response = new HashMap<>();
        try {
            String newId = egovDeptJobBoxService.createDeptJobBox(userId, dto);
            response.put("success", true);
            response.put("message", "부서업무함이 등록되었습니다.");
            response.put("deptJobbxId", newId);
        } catch (Exception e) {
            log.error("Failed to create dept job box: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "등록에 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 부서업무함 수정
     */
    @PutMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<Map<String, Object>> updateDeptJobBox(
            @PathVariable String deptJobbxId,
            @RequestBody DeptJobBoxDto dto) {
        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {
            return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다."));
        }

        Map<String, Object> response = new HashMap<>();
        try {
            egovDeptJobBoxService.updateDeptJobBox(deptJobbxId, userId, dto);
            response.put("success", true);
            response.put("message", "부서업무함이 수정되었습니다.");
        } catch (Exception e) {
            log.error("Failed to update dept job box: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "수정에 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 부서업무함 삭제
     */
    @DeleteMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<Map<String, Object>> deleteDeptJobBox(@PathVariable String deptJobbxId) {
        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {
            return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다."));
        }

        Map<String, Object> response = new HashMap<>();
        try {
            egovDeptJobBoxService.deleteDeptJobBox(deptJobbxId);
            response.put("success", true);
            response.put("message", "부서업무함이 삭제되었습니다.");
        } catch (Exception e) {
            log.error("Failed to delete dept job box: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "삭제에 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    private String getCurrentUserId() {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        return (user != null) ? user.getUniqId() : "anonymous";
    }
}
