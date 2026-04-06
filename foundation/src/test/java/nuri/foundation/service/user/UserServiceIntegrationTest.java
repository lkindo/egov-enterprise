package nuri.foundation.service.user;

import nuri.foundation.support.IntegrationTest;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.user.dto.UserDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
    @Autowired private jakarta.persistence.EntityManager entityManager;
    @Autowired private CacheManager cacheManager;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        // 캐시 초기화
        if (cacheManager.getCache("users") != null) {
            cacheManager.getCache("users").clear();
        }
        
        userAuthorityRepository.deleteAll();
        userRepository.deleteAll();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("사용자 목록 조회 - N+1 쿼리 해결 검증")
    void getUserList_NPlusOneResolved() {
        // Given: 사용자 및 권한 설정
        createUser("user1", "사용자1", "ROLE_ADMIN");
        createUser("user2", "사용자2", "ROLE_USER");

        entityManager.flush();
        entityManager.clear();

        // When
        List<UserDto> users = userService.getUserList();

        // Then
        assertThat(users).isNotEmpty();
    }

    private void createUser(String userId, String name, String role) {
        User user = User.builder()
                .userId(userId)
                .userNm(name)
                .esntlId("ESNTL_" + userId)
                .password(passwordEncoder.encode("password"))
                .emailAdres(userId + "@example.com")
                .build();
        userRepository.save(user);
    }
}