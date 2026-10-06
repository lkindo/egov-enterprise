package nuri.business.domain.user.repository;


import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserRepository 테스트")
class UserRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager em;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .userId("testUser")
                .esntlId("USR_000000000001")
                .userNm("테스트유저")
                .pswd("password")
                .emlAddr("test@example.com")
                .role(Role.USER)
                .build();
        userRepository.save(testUser);
    }

    @Test
    @DisplayName("사용자 ID로 조회")
    void findById() {
        Optional<User> found = userRepository.findByUserId("testUser");
        assertThat(found).isPresent();
        assertThat(found.get().getUserNm()).isEqualTo("테스트유저");
    }

    @Test
    @DisplayName("esntlId로 조회")
    void findByEsntlId() {
        Optional<User> found = userRepository.findByEsntlId("USR_000000000001");
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("getPagedUserList - 키워드 없음")
    void getPagedUserList_NoKeyword() {
        var result = userRepository.getPagedUserList(null, UserListFilter.NONE, PageRequest.of(0, 10));
        assertThat(result.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("getPagedUserList - 키워드 있음")
    void getPagedUserList_WithKeyword() {
        var result = userRepository.getPagedUserList("testUser", UserListFilter.NONE, PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).userId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("[DIP B5 F4] 목록 행은 상태·부서·잠금을 싣고, 그 세 가지로 좁힐 수 있다")
    void getPagedUserList_filtersByStatusDeptAndLock() {
        userRepository.save(User.builder().userId("lockedOne").esntlId("LOCK_001").userNm("잠긴사람").pswd("pw")
                .role(Role.USER).userSttsCd("P").ognzId("ORG_A").lckYn("Y").build());
        userRepository.save(User.builder().userId("pendingOne").esntlId("PEND_001").userNm("대기사람").pswd("pw")
                .role(Role.USER).userSttsCd("A").ognzId("ORG_B").build());
        em.flush();
        em.clear();

        var locked = userRepository.getPagedUserList(null,
                UserListFilter.of(null, null, "Y"), PageRequest.of(0, 50)).getContent();
        assertThat(locked).extracting(nuri.business.service.user.dto.UserDto::userId).contains("lockedOne").doesNotContain("pendingOne");
        var row = locked.stream().filter(u -> "lockedOne".equals(u.userId())).findFirst().orElseThrow();
        assertThat(row.userSttsCd()).isEqualTo("P");
        assertThat(row.ognzId()).isEqualTo("ORG_A");
        assertThat(row.lckYn()).isEqualTo("Y");

        // 잠금 'N' 은 잠기지 않은 계정이다.
        assertThat(userRepository.getPagedUserList(null, UserListFilter.of(null, null, "N"),
                PageRequest.of(0, 50)).getContent()).extracting(nuri.business.service.user.dto.UserDto::userId)
                .contains("pendingOne").doesNotContain("lockedOne");
        assertThat(userRepository.getPagedUserList(null, UserListFilter.of("A", "ORG_B", null),
                PageRequest.of(0, 50)).getContent()).extracting(nuri.business.service.user.dto.UserDto::userId)
                .containsExactly("pendingOne");
    }
}
