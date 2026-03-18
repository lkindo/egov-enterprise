package com.company.project.service.system.policy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 시스템 정책(저작권, 개인정보처리방침 등) 관련 서비스 클래스.
 * 기존 service.site.PolicyService를 프로젝트 정리를 위해 이관함.
 */
@Service
public class PolicyService {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Policy {
        private String title;
        private String content;
    }

    /**
     * 정책 조회 (현재는 미구현 상태이므로 빈 Optional 반환)
     */
    public Optional<Policy> getPolicy(String type) {
        // TODO: 향후 DB 연동 시 각 정책 타입별 데이터 로드 구현 필요.
        return Optional.empty();
    }

    /**
     * 정책 수정 구현부 (현재는 로깅만 함)
     */
    public void updatePolicy(String type, String title, String content) {
        // TODO: 향후 DB 수정 로직 구현 필요.
    }
}
