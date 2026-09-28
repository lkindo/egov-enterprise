package nuri.business.domain.system.policy;

/** 할당형 정책 코드를 생성할 때 기존 행을 merge로 덮어쓰지 않는다. */
public interface SystemPolicyRepositoryCustom {
    void insert(SystemPolicy policy);
}
