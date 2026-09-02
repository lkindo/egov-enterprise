package nuri.business.service.system.policy;

import nuri.business.domain.system.policy.SystemPolicy;
import nuri.business.domain.system.policy.SystemPolicyRepository;
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
        private String plcyTypeCd;
        private String plcyTtl;
        private String plcyCn;
    }

    /**
     * 정책 전체 목록 조회
     */
    @Cacheable(value = CACHE_SYSTEM_POLICIES_ALL)
    public List<Policy> getPolicies() {
        return systemPolicyRepository.findAll().stream()
                .map(entity -> Policy.builder()
                        .plcyTypeCd(entity.getPlcyTypeCd())
                        .plcyTtl(entity.getPlcyTtl())
                        .plcyCn(entity.getPlcyCn())
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
                        .plcyTypeCd(entity.getPlcyTypeCd())
                        .plcyTtl(entity.getPlcyTtl())
                        .plcyCn(entity.getPlcyCn())
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
        validatePolicyType(type);
        SystemPolicy policy = systemPolicyRepository.findById(type)
                .orElseGet(() -> SystemPolicy.builder()
                        .plcyTypeCd(type)
                        .build());

        policy.update(title, content);
        systemPolicyRepository.save(policy);
    }

    /** {@code tb_plcy_manage.plcy_type_cd} 의 물리 폭. PK 라 넘치면 INSERT 가 통째로 실패한다. */
    static final int POLICY_TYPE_MAX_LENGTH = 12;

    /**
     * 정책 유형 키를 물리 계약에 맞춰 검증한다.
     *
     * <p><b>왜 필요한가 — 2026-09-02 실측.</b> 이 메서드는 upsert 라 경로 변수 {@code type} 이 그대로
     * 새 PK 행이 된다. 그런데 요청 DTO 는 제목·본문만 100/4000 으로 묶고 {@code type} 에는 어떤 검증도
     * 없었다. 컬럼은 varchar(12) 이므로 13자 이상은 Bean Validation 을 통과한 뒤 DB 제약 위반으로
     * 500 이 났고, 공백·제어문자는 그대로 PK 가 됐다.
     *
     * <p><b>값 도메인(허용 목록)은 두지 않는다.</b> 어떤 유형 코드가 정당한지는 시드·공통코드·화면
     * 어디에도 정의돼 있지 않다 — 그 목록을 여기서 지어내면 첫 실사용에서 맞지 않는다(H4).
     * 물리 폭과 식별자 문자셋(영대문자·숫자·밑줄)만 강제한다. 값 도메인 확정은 제품 결정이다.
     */
    private static void validatePolicyType(String type) {
        if (type == null || type.isBlank()) {
            throw new nuri.foundation.core.exception.BusinessException(
                    "정책 유형 코드는 비어 있을 수 없습니다.",
                    nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (type.length() > POLICY_TYPE_MAX_LENGTH) {
            throw new nuri.foundation.core.exception.BusinessException(
                    "정책 유형 코드는 " + POLICY_TYPE_MAX_LENGTH + "자 이내여야 합니다: " + type.length() + "자",
                    nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (!type.matches("[A-Z0-9_]+")) {
            throw new nuri.foundation.core.exception.BusinessException(
                    "정책 유형 코드는 영대문자·숫자·밑줄만 쓸 수 있습니다.",
                    nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
