package nuri.foundation.core.user;

import java.util.Collection;
import java.util.Map;

/**
 * 이미 열람이 허용된 데이터의 참여자 내부 ID를 현재 표시 이름으로 해석하는 읽기 전용 포트.
 * 호출자는 먼저 열람 범위를 확정하고 그 결과에 포함된 ID만 넘긴다. 이 조회가 열람 권한을 부여하지 않는다.
 * 이름이 없거나 사용자가 삭제되었으면 결과에 포함하지 않아 호출자가 기존 식별자 표시를 유지한다.
 */
public interface UserDisplayNameLookup {

    /** esntlId 기준 일괄 조회. 상태가 비활성이어도 남아 있는 이름은 반환하며, 빈 입력은 저장소를 조회하지 않는다. */
    Map<String, String> findDisplayNames(Collection<String> esntlIds);
}
