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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.company.project.service.community.EgovCommunityService;
import com.company.project.service.community.dto.CommunityDto;
import com.company.project.service.community.dto.CommunityUserDto;
import com.company.project.web.adapter.CommunityAdapter;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 커뮤니티 REST API Controller
 * 
 * Next.js 프론트엔드에서 사용하기 위한 JSON 기반 REST API 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/community")
@RequiredArgsConstructor
public class CommunityApiController {

    private final EgovCommunityService egovCommunityService;

    /**
     * 커뮤니티 목록 조회
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getCommunityList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<CommunityDto> pageResult = egovCommunityService.getCommunityList(searchWrd, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("resultList", pageResult.getContent().stream()
                .map(CommunityAdapter::toVO)
                .collect(Collectors.toList()));
        response.put("totalCount", pageResult.getTotalElements());
        response.put("pageIndex", pageIndex);
        response.put("pageUnit", pageUnit);
        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);
    }

    /**
     * 커뮤니티 상세 조회
     */
    @GetMapping("/{cmmntyId}")
    public ResponseEntity<Map<String, Object>> getCommunity(@PathVariable String cmmntyId) {
        CommunityDto dto = egovCommunityService.getCommunity(cmmntyId);

        if (dto == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("community", CommunityAdapter.toVO(dto));

        // 로그인 사용자의 멤버십 상태 확인
        String userId = getCurrentUserId();
        if (userId != null && !userId.equals("anonymous")) {
            String memberStatus = egovCommunityService.checkCommunityUserStatus(cmmntyId, userId);
            boolean isManager = egovCommunityService.isManager(cmmntyId, userId);
            response.put("memberStatus", memberStatus);
            response.put("isManager", isManager);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 커뮤니티 사용자 목록 조회
     */
    @GetMapping("/{cmmntyId}/users")
    public ResponseEntity<Map<String, Object>> getCommunityUsers(
            @PathVariable String cmmntyId,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<CommunityUserDto> pageResult = egovCommunityService.getCommunityUserList(cmmntyId, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("resultList", pageResult.getContent().stream()
                .map(CommunityAdapter::toUserVO)
                .collect(Collectors.toList()));
        response.put("totalCount", pageResult.getTotalElements());
        response.put("pageIndex", pageIndex);
        response.put("pageUnit", pageUnit);

        return ResponseEntity.ok(response);
    }

    /**
     * 커뮤니티 가입
     */
    @PostMapping("/{cmmntyId}/join")
    public ResponseEntity<Map<String, Object>> joinCommunity(@PathVariable String cmmntyId) {
        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {
            return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다."));
        }

        Map<String, Object> response = new HashMap<>();
        try {
            egovCommunityService.joinCommunity(cmmntyId, userId);
            response.put("success", true);
            response.put("message", "커뮤니티에 가입되었습니다.");
        } catch (Exception e) {
            log.error("Failed to join community: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "가입에 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 커뮤니티 탈퇴
     */
    @DeleteMapping("/{cmmntyId}/leave")
    public ResponseEntity<Map<String, Object>> leaveCommunity(@PathVariable String cmmntyId) {
        String userId = getCurrentUserId();

        if (userId == null || userId.equals("anonymous")) {
            return ResponseEntity.status(401).body(Map.of("error", "로그인이 필요합니다."));
        }

        Map<String, Object> response = new HashMap<>();

        // 관리자는 탈퇴 불가
        boolean isManager = egovCommunityService.isManager(cmmntyId, userId);
        if (isManager) {
            response.put("success", false);
            response.put("message", "관리자는 커뮤니티를 탈퇴할 수 없습니다.");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            egovCommunityService.leaveCommunity(cmmntyId, userId);
            response.put("success", true);
            response.put("message", "커뮤니티에서 탈퇴되었습니다.");
        } catch (Exception e) {
            log.error("Failed to leave community: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "탈퇴에 실패했습니다: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    private String getCurrentUserId() {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        return (user != null) ? user.getUniqId() : "anonymous";
    }
}
