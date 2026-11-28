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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
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
    private final nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Policy {
        private String plcyTypeCd;
        private String plcyTtl;
        private String plcyCn;
        /** 낙관적 잠금 버전. 수정 요청에 그대로 돌려보내며 불일치 시 409로 거부한다. */
        private Integer version;
        private LocalDateTime crtDt;
        private LocalDateTime mdfcnDt;
        private String lastMdfrId;
    }

    /** 일반 사용자 열람용 정책 DTO. 관리용 버전·수정자 식별자는 노출하지 않는다. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicPolicy {
        private String plcyTypeCd;
        private String plcyTtl;
        private String plcyCn;
        private LocalDateTime mdfcnDt;
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

    /**
     * 일반 사용자용 정책 조회. PK가 대문자 규약이므로 대소문자를 정규화해 조회하며,
     * 미등록 또는 비정규 유형은 기본 본문을 만들지 않고 빈 값을 반환한다.
     */
    public Optional<PublicPolicy> getPublicPolicy(String type) {
        String normalized = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
        if (!isValidPolicyType(normalized)) {
            return Optional.empty();
        }
        return systemPolicyRepository.findById(normalized).map(PolicyService::toPublicPolicy);
    }

    private static Policy toPolicy(SystemPolicy entity) {
        return Policy.builder()
                .plcyTypeCd(entity.getPlcyTypeCd())
                .plcyTtl(entity.getPlcyTtl())
                .plcyCn(entity.getPlcyCn())
                .version(entity.getVersion())
                .crtDt(entity.getCrtDt())
                .mdfcnDt(entity.getMdfcnDt())
                .lastMdfrId(entity.getLastMdfrId())
                .build();
    }

    private static PublicPolicy toPublicPolicy(SystemPolicy entity) {
        return PublicPolicy.builder()
                .plcyTypeCd(entity.getPlcyTypeCd())
                .plcyTtl(entity.getPlcyTtl())
                .plcyCn(entity.getPlcyCn())
                .mdfcnDt(entity.getMdfcnDt())
                .build();
    }

    /**
     * 이미 있는 정책은 화면이 읽은 버전과 대조해 동시 덮어쓰기를 409로 거부하며,
     * 없는 유형의 첫 저장은 버전을 보지 않는다. 커밋 시 민감 작업 감사 원장에 기록한다.
     */
    @Transactional
    public void updatePolicy(String type, String title, String content, Integer version) {
        nuri.business.security.util.SecurityUtil.assertPermission("POLICY_UPDATE");
        validatePolicyType(type);
        Optional<SystemPolicy> existing = systemPolicyRepository.findById(type);
        if (existing.isEmpty() && version != null) {
            throw new nuri.foundation.core.exception.BusinessException(
                    nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION,
                    nuri.foundation.core.util.EntityVersions.STALE_VERSION_MESSAGE);
        }
        existing.ifPresent(current -> nuri.foundation.core.util.EntityVersions.assertCurrent(version, current.getVersion()));
        SystemPolicy policy = existing.orElseGet(() -> SystemPolicy.builder()
                .plcyTypeCd(type)
                .build());

        policy.update(title, content);
        // 정책 변경을 감사 호출 전에 flush해 실제 낙관적 잠금 실패(409)가 감사 catch-block 에서 503으로 변환되지 않게 한다.
        systemPolicyRepository.saveAndFlush(policy);
        sensitiveAudit.recordMutation("POLICY_UPDATE", type);
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
        sensitiveAudit.recordMutation("POLICY_CREATE", type);
    }

    /** {@code tb_plcy_manage.plcy_type_cd} 의 물리 폭. PK 라 넘치면 INSERT 가 통째로 실패한다. */
    static final int POLICY_TYPE_MAX_LENGTH = 12;

    private static boolean isValidPolicyType(String type) {
        return type != null
                && !type.isBlank()
                && type.length() <= POLICY_TYPE_MAX_LENGTH
                && type.matches("[A-Z0-9_]+");
    }

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
