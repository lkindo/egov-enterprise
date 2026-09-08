package nuri.foundation.core.template;

/**
 * 템플릿을 참조하는 기능 모듈이 자기 참조 건수를 알려 주는 포트.
 *
 * <p>{@code tb_bbs_master.tmplt_id} 는 물리 FK 없이 문자열로 템플릿을 가리킨다(V2_0).
 * 템플릿 삭제 전에 참조 여부를 물어야 하는데, 템플릿 도메인이 게시판 도메인을 직접 import 하면
 * 서비스 계층 교차 결합(GAP-ARCH-001)이 늘어난다. 첨부 참조원 포트({@code AttachmentSourceContributor})와
 * 같은 방식으로 규칙의 소유권을 참조하는 쪽에 두고, 템플릿 도메인은 이 포트만 본다. 도메인이 base projection
 * 에서 제거되면 contributor 도 함께 사라져 존재하지 않는 테이블을 조회하지 않는다.
 */
public interface TemplateReferenceContributor {

    /** 사람이 읽는 참조원 이름(예: {@code 게시판}). 삭제 거부 메시지에 실린다. */
    String sourceLabel();

    /** 해당 템플릿 ID 를 참조하는 행 수. */
    long countReferences(String tmpltId);
}
