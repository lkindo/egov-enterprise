package nuri.foundation.core.template;

import java.util.List;

/**
 * 실제 템플릿 원장을 새로 참조하는 트랜잭션의 존재·활성 검증 포트.
 *
 * <p>템플릿 기능은 커뮤니티의 선택 연동이다(DEC-OPS-280). 구현은 템플릿 기능의 서비스이고, 템플릿 기능이 빠진 구성에는
 * 구현이 없다 — 소비자는 ObjectProvider 로 받아 구현이 없으면 새 템플릿 지정을 거부한다.
 */
public interface TemplateAssignmentPolicy {
    /** 원장 행을 잠그고 존재하는 활성 항목인지 확인한다. 호출자는 쓰기 트랜잭션을 유지한다. */
    void assertActiveForAssignment(String templateId);

    /** 새로 지정할 수 있는 사용 중 항목. 템플릿 조회 권한(TEMPLATE_READ)이 있어야 한다. */
    List<AssignableTemplate> assignableTemplates();
}
