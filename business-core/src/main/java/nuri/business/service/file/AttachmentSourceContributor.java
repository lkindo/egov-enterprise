package nuri.business.service.file;

import java.util.Collection;

/**
 * 기능 모듈이 자기 첨부 참조 규칙을 등록하는 포트.
 *
 * <p>core가 선택 기능의 물리 테이블을 직접 순회하지 않도록 규칙의 소유권을 기능 패키지에 둔다.
 * 도메인이 base projection에서 제거되면 contributor도 함께 제거되어 존재하지 않는 테이블을
 * 권한 판정 중 조회하지 않는다.
 */
public interface AttachmentSourceContributor {

    Collection<AttachmentSource> sources();
}
