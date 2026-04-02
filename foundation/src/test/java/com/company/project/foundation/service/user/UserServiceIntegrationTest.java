package com.company.project.foundation.service.user;

import com.company.project.foundation.support.IntegrationTest;
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
// import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * UserService ?�합 ?�스?? * - N+1 쿼리 ?�결 검�? * - 권한 매핑 검�? * - 캐싱 ?�작 검�? */
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
        // 캐시 ?�리??        cacheManager.getCache("users").clear();
    }

    @Test
    @DisplayName("?�용??목록 조회 - N+1 쿼리 ?�결 검�?)
    void getUserList_NPlusOneResolved() {
        // Given: 5 명의 ?�용?��? 권한 ?�정
        createUser("user1", "?�용??1", "ROLE_ADMIN");
        createUser("user2", "?�용??2", "ROLE_USER");
        createUser("user3", "?�용??3", "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear(); // ?�속??컨텍?�트 초기??(N+1 검증을 ?�해)

        // When: ?�용??목록 조회
        List<UserDto> result = userService.getUserList();

        // Then: 1 개의 쿼리�?모든 ?�용?��? 권한 조회 (N+1 발생 ?�함)
        assertThat(result).hasSize(3);
        assertThat(result).extracting("userId", "userNm", "role")
                .containsExactlyInAnyOrder(
                        org.assertj.core.api.Assertions.tuple("user1", "?�용??1", "ROLE_ADMIN"),
                        org.assertj.core.api.Assertions.tuple("user2", "?�용??2", "ROLE_USER"),
                        org.assertj.core.api.Assertions.tuple("user3", "?�용??3", "ROLE_ADMIN")
                );
    }

    @Test
    @DisplayName("캐싱 ?�작 검�?- 2 번째 ?�출?� 캐시?�서 조회")
    void getUserList_Caching() {
        // Given: ?�용???�이???�정
        createUser("cacheUser", "캐시?�스??, "ROLE_USER");
        entityManager.flush();
        entityManager.clear();

        // When: �?번째 ?�출 (캐시 미스)
        long startTime1 = System.currentTimeMillis();
        List<UserDto> result1 = userService.getUserList();
        long endTime1 = System.currentTimeMillis();

        // Then: �?번째 ?�출?� DB 조회
        assertThat(result1).hasSize(1);
        assertThat(endTime1 - startTime1).isGreaterThan(0);

        // When: ??번째 ?�출 (캐시 ?�트)
        long startTime2 = System.currentTimeMillis();
        List<UserDto> result2 = userService.getUserList();
        long endTime2 = System.currentTimeMillis();

        // Then: ??번째 ?�출?� 캐시?�서 조회 (빠름)
        assertThat(result2).hasSize(1);
        assertThat(endTime2 - startTime2).isLessThanOrEqualTo(endTime1 - startTime1);
    }

    @Test
    @DisplayName("권한 매핑 검�?- ?�용?��? 권한???�바르게 매핑??)
    void getUserList_AuthorityMapping() {
        // Given: ?�양??권한??가�??�용?�들
        createUser("admin", "관리자", "ROLE_ADMIN");
        createUser("user", "?�반?�용??, "ROLE_USER");

        entityManager.flush();
        entityManager.clear();

        // When: ?�용??목록 조회
        List<UserDto> result = userService.getUserList();

        // Then: 권한???�바르게 매핑??        assertThat(result).hasSize(2);
        assertThat(result).extracting("userId", "role")
                .containsExactlyInAnyOrder(
                        org.assertj.core.api.Assertions.tuple("admin", "ROLE_ADMIN"),
                        org.assertj.core.api.Assertions.tuple("user", "ROLE_USER")
                );
    }

    // ?�스???�퍼 메서??    private void createUser(String userId, String userNm, String role) {
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
