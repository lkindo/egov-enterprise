package nuri.business.service.system.policy;

import nuri.business.domain.system.policy.SystemPolicy;
import nuri.business.domain.system.policy.SystemPolicyRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
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
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Policy {
        private String plcyTypeCd;
        private String plcyTtl;
        private String plcyCn;
        /** 낙관적 잠금 버전(V2_155). 수정 요청에 그대로 돌려보낸다 — 다르면 409. */
        private Integer version;
    }

    /**
     * 정책 전체 목록 조회
     */
    // 늦은 reader가 writer의 evict 뒤에 옛 값을 다시 넣을 수 있어 정책은 DB에서 읽는다.
    public List<Policy> getPolicies() {
        return systemPolicyRepository.findAll().stream()
                .map(PolicyService::toPolicy)
                .collect(Collectors.toList());
    }

    /**
     * 정책 상세 조회
     */
    public Optional<Policy> getPolicy(String type) {
        return systemPolicyRepository.findById(type).map(PolicyService::toPolicy);
    }

    private static Policy toPolicy(SystemPolicy entity) {
        return Policy.builder()
                .plcyTypeCd(entity.getPlcyTypeCd())
                .plcyTtl(entity.getPlcyTtl())
                .plcyCn(entity.getPlcyCn())
                .version(entity.getVersion())
                .build();
    }

    /**
     * 정책 수정 구현부.
     *
     * <p>[2026-11-25 V2_155] 이미 있는 정책은 화면이 읽은 버전과 대조한다 — 두 관리자가 같은 정책을 열고 차례로 저장하면 늦은
     * 저장이 앞 저장을 알림 없이 덮었다(법적 고지 본문이라 영향이 컸다). 없는 유형은 종전처럼 새로 만들며 버전을 보지 않는다.
     */
    @Transactional
    public void updatePolicy(String type, String title, String content, Integer version) {
        nuri.business.security.util.SecurityUtil.assertPermission("POLICY_UPDATE");
        validatePolicyType(type);
        Optional<SystemPolicy> existing = systemPolicyRepository.findById(type);
        existing.ifPresent(current -> nuri.foundation.core.util.EntityVersions.assertCurrent(version, current.getVersion()));
        SystemPolicy policy = existing.orElseGet(() -> SystemPolicy.builder()
                .plcyTypeCd(type)
                .build());

        policy.update(title, content);
        systemPolicyRepository.save(policy);
    }

    /** 첫 등록은 기존 PUT upsert와 구분하고 DB PK로 동시 중복 생성도 거부한다. */
    @Transactional
    public void createPolicy(String type, String title, String content) {
        nuri.business.security.util.SecurityUtil.assertPermission("POLICY_UPDATE");
        validatePolicyType(type);
        if (systemPolicyRepository.existsById(type)) {
            throw new nuri.foundation.core.exception.BusinessException(
                    "이미 등록된 정책 유형입니다. 기존 정책을 수정해 주세요.",
                    nuri.foundation.core.exception.CommonErrorCode.DUPLICATE_RESOURCE);
        }
        systemPolicyRepository.insert(SystemPolicy.builder()
                .plcyTypeCd(type).plcyTtl(title).plcyCn(content).build());
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
