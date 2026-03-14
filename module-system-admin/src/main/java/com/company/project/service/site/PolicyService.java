package com.company.project.service.site;

import com.company.project.domain.site.SitePolicy;
import com.company.project.domain.site.SitePolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 시스템 정책 및 약관 처리를 위한 서비스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PolicyService {

    private final SitePolicyRepository sitePolicyRepository;

    /**
     * 정책 유형에 따른 내용 조회
     */
    public Optional<SitePolicy> getPolicy(String type) {
        return sitePolicyRepository.findById(type);
    }

    /**
     * 정책 내용 수정 또는 신규 등록
     */
    @Transactional
    public void updatePolicy(String type, String title, String content) {
        SitePolicy policy = sitePolicyRepository.findById(type)
                .orElseGet(() -> SitePolicy.builder()
                        .policyType(type)
                        .title(title)
                        .content(content)
                        .build());
        
        policy.update(title, content);
        sitePolicyRepository.save(policy);
    }
}
