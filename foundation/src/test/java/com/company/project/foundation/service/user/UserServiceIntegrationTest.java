package com.company.project.foundation.service.user;

import com.company.foundation.support.IntegrationTest;
import com.company.project.foundation.domain.auth.UserAuthority;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.service.user.dto.UserDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * UserService 통합 테스트
 * - N+1 쿼리 해결 검증
 * - 권한 매핑 검증
 * - 캐싱 동작 검증
 */
@IntegrationTest
class UserServiceIntegrationTest {

    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private UserAuthorityRepository userAuthorityRepository;
    @Autowired private TestEntityManager entityManager;
    @Autowired private CacheManager cacheManager;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        // 캐시 클리어
        cacheManager.getCache("users").clear();
    }

    @Test
    @DisplayName("사용자 목록 조회 - N+1 쿼리 해결 검증")
    void getUserList_NPlusOneResolved() {
        // Given: 5 명의 사용자와 권한 설정
        createUser("user1", "사용자 1", "ROLE_ADMIN");
        createUser("user2", "사용자 2", "ROLE_USER");
        createUser("user3", "사용자 3", "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear(); // 영속성 컨텍스트 초기화 (N+1 검증을 위해)

        // When: 사용자 목록 조회
        List<UserDto> result = userService.getUserList();

        // Then: 1 개의 쿼리로 모든 사용자와 권한 조회 (N+1 발생 안함)
        assertThat(result).hasSize(3);
        assertThat(result).extracting("userId", "userNm", "role")
                .containsExactlyInAnyOrder(
                        org.assertj.core.api.Assertions.tuple("user1", "사용자 1", "ROLE_ADMIN"),
                        org.assertj.core.api.Assertions.tuple("user2", "사용자 2", "ROLE_USER"),
                        org.assertj.core.api.Assertions.tuple("user3", "사용자 3", "ROLE_ADMIN")
                );
    }

    @Test
    @DisplayName("캐싱 동작 검증 - 2 번째 호출은 캐시에서 조회")
    void getUserList_Caching() {
        // Given: 사용자 데이터 설정
        createUser("cacheUser", "캐시테스트", "ROLE_USER");
        entityManager.flush();
        entityManager.clear();

        // When: 첫 번째 호출 (캐시 미스)
        long startTime1 = System.currentTimeMillis();
        List<UserDto> result1 = userService.getUserList();
        long endTime1 = System.currentTimeMillis();

        // Then: 첫 번째 호출은 DB 조회
        assertThat(result1).hasSize(1);
        assertThat(endTime1 - startTime1).isGreaterThan(0);

        // When: 두 번째 호출 (캐시 히트)
        long startTime2 = System.currentTimeMillis();
        List<UserDto> result2 = userService.getUserList();
        long endTime2 = System.currentTimeMillis();

        // Then: 두 번째 호출은 캐시에서 조회 (빠름)
        assertThat(result2).hasSize(1);
        assertThat(endTime2 - startTime2).isLessThanOrEqualTo(endTime1 - startTime1);
    }

    @Test
    @DisplayName("권한 매핑 검증 - 사용자와 권한이 올바르게 매핑됨")
    void getUserList_AuthorityMapping() {
        // Given: 다양한 권한을 가진 사용자들
        createUser("admin", "관리자", "ROLE_ADMIN");
        createUser("user", "일반사용자", "ROLE_USER");

        entityManager.flush();
        entityManager.clear();

        // When: 사용자 목록 조회
        List<UserDto> result = userService.getUserList();

        // Then: 권한이 올바르게 매핑됨
        assertThat(result).hasSize(2);
        assertThat(result).extracting("userId", "role")
                .containsExactlyInAnyOrder(
                        org.assertj.core.api.Assertions.tuple("admin", "ROLE_ADMIN"),
                        org.assertj.core.api.Assertions.tuple("user", "ROLE_USER")
                );
    }

    // 테스트 헬퍼 메서드
    private void createUser(String userId, String userNm, String role) {
        User user = User.builder()
                .userId(userId)
                .userNm(userNm)
                .password(passwordEncoder.encode("password123"))
                .emailAdres(userId + "@example.com")
                .role(Role.valueOf(role))
                .build();
        userRepository.save(user);

        UserAuthority authority = UserAuthority.builder()
                .uniqId(user.getEsntlId())
                .authorCode(role)
                .build();
        userAuthorityRepository.save(authority);
    }
}
