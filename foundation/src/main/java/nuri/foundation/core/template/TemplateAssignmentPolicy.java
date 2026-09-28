package nuri.foundation.core.template;

/** 실제 템플릿 원장을 새로 참조하는 트랜잭션의 존재·활성 검증 포트. */
public interface TemplateAssignmentPolicy {
    /** 원장 행을 잠그고 존재하는 활성 항목인지 확인한다. 호출자는 쓰기 트랜잭션을 유지한다. */
    void assertActiveForAssignment(String templateId);
}
