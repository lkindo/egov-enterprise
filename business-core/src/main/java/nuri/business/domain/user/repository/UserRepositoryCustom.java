package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepositoryCustom {
    /**
     * 관리자 사용자 목록. 휴대전화·이메일은 가려서 싣는다(2026-10-18) — 원문은 개인정보 접근 기록과 함께 상세 조회에서만 나간다.
     */
    Page<nuri.business.service.user.dto.UserDto> getPagedUserList(String searchKeyword,
            UserListFilter filter, Pageable pageable);

    /**
     * 이미 읽은 사용자 행에 쓰기 잠금을 걸고 상태를 DB 의 현재 값으로 다시 읽는다(로그인 실패 횟수의 원자적 갱신).
     * 메모리에서 바꾼 값은 버려진다.
     */
    void refreshForUpdate(User user);

    /**
     * 담당자 지정용 사용자 검색. 성명(user_nm) 부분일치만 본다.
     *
     * <p>일반 사용자에게 열리는 경로이므로 {@link #getPagedUserList} 와 달리
     * <b>offset 이 없다</b>. 페이지를 넘겨가며 인명부 전체를 긁어내는 것을 막기 위해
     * 상위 {@code limit} 건만 돌려주고 끝낸다(총 건수도 세지 않는다 —
     * 조직 규모 자체가 정보다).</p>
     *
     * <p>키워드 최소 길이·limit 상한 검증은 호출부인
     * {@code UserService#searchAssignableUsers} 가 책임진다. 이 메서드는
     * <b>빈 키워드를 받으면 조건 없이 전체를 반환</b>하는 QueryDSL 의 기본 동작을
     * 그대로 노출하지 않도록 방어적으로 빈 목록을 돌려준다.</p>
     *
     * @param keyword 성명 일부(공백 제거 후 사용)
     * @param limit   최대 반환 건수
     */
    java.util.List<nuri.business.service.user.dto.UserSearchDto> searchAssignableUsers(String keyword, int limit);

    /**
     * 한 부서의 사용 중(P) 계정인 직속 소속 인원을 성명 순으로 최대 {@code limit} 건 돌려준다(2026-09-27 DIP B5 F5).
     * 하위 부서는 포함하지 않는다. 항목은 {@code searchAssignableUsers} 와 같은 최소 필드다.
     */
    java.util.List<nuri.business.service.user.dto.UserSearchDto> findActiveDepartmentMembers(String ognzId, int limit);

    /**
     * 식별자 목록의 사람을 검색 결과와 같은 최소 필드(이름·부서명·부재)로 돌려준다. 계정 상태로 거르지 않는다 —
     * 이미 결재선에 있는 사람이 사용 중지돼도 이름은 보여야 한다. 연락처는 싣지 않는다(2026-10-03 결재 동선 개선).
     */
    java.util.List<nuri.business.service.user.dto.UserSearchDto> findProfilesByEsntlIds(java.util.Collection<String> esntlIds);
}

