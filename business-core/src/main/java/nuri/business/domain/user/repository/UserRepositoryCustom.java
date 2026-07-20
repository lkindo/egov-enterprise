package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepositoryCustom {
    Page<User> searchUsers(String sbscrbSttus, String searchCondition, String searchKeyword, Pageable pageable);

    Page<nuri.business.service.user.dto.UserDto> getPagedUserList(String searchKeyword, Pageable pageable);

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

    int checkIdDplct(String checkId);
}

