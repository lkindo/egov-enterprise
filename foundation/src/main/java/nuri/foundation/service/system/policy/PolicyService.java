package nuri.foundation.service.system.policy;

import nuri.foundation.domain.system.policy.SystemPolicy;
import nuri.foundation.domain.system.policy.SystemPolicyRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 시스템 정책(저작권, 개인정보처리방침 등) 관련 서비스 클래스.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PolicyService {

    private final SystemPolicyRepository systemPolicyRepository;
    
    // 캐시 이름 정의
    public static final String CACHE_SYSTEM_POLICIES = "systemPolicies";
    public static final String CACHE_SYSTEM_POLICIES_ALL = "systemPoliciesAll";

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Policy {
        private String id;
        private String title;
        private String content;
    }

    /**
     * 정책 전체 목록 조회
     */
    @Cacheable(value = CACHE_SYSTEM_POLICIES_ALL)
    public List<Policy> getPolicies() {
        return systemPolicyRepository.findAll().stream()
                .map(entity -> Policy.builder()
                        .id(entity.getPolicyType())
                        .title(entity.getTitle())
                        .content(entity.getContent())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 정책 상세 조회
     */
    @Cacheable(value = CACHE_SYSTEM_POLICIES, key = "#type")
    public Optional<Policy> getPolicy(String type) {
        return systemPolicyRepository.findById(type)
                .map(entity -> Policy.builder()
                        .id(entity.getPolicyType())
                        .title(entity.getTitle())
                        .content(entity.getContent())
                        .build());
    }

    /**
     * 정책 수정 구현부
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CACHE_SYSTEM_POLICIES, key = "#type"),
        @CacheEvict(value = CACHE_SYSTEM_POLICIES_ALL, allEntries = true)
    })
    public void updatePolicy(String type, String title, String content) {
        SystemPolicy policy = systemPolicyRepository.findById(type)
                .orElseGet(() -> SystemPolicy.builder()
                        .policyType(type)
                        .build());
        
        policy.update(title, content);
        systemPolicyRepository.save(policy);
    }
}
