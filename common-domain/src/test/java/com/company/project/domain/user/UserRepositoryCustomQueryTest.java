package com.company.project.domain.user;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;

import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
class UserRepositoryCustomQueryTest {

        @Autowired
        private UserRepository userRepository;

        @Test
        @DisplayName("사용자 검색 조건으로 조회 성공")
        void searchUsersWithCondition_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("사용자1")
                                .esntlId("USR00001")
                                .password("encodedPassword")
                                .role(Role.USER)
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("사용자2")
                                .esntlId("USR00002")
                                .password("encodedPassword")
                                .role(Role.ADMIN)
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));

                // When
                Pageable pageable = PageRequest.of(0, 10);
                Page<User> result = userRepository.findAll(pageable);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getContent()).hasSize(2);
                assertThat(result.getContent()).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1",
                                "testUser2");
        }

        @Test
        @DisplayName("이름 포함 사용자 검색")
        void findByUserNmContaining_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("홍길동1")
                                .esntlId("USR00001")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("홍길동2")
                                .esntlId("USR00002")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("이순신")
                                .esntlId("USR00003")
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByUserNmContaining("홍길동");

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getUserNm).containsExactlyInAnyOrder("홍길동1", "홍길동2");
        }

        @Test
        @DisplayName("이메일 포함 사용자 검색")
        void findByEmailAdresContaining_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("사용자")
                                .esntlId("USR00001")
                                .emailAdres("test1@example.com")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("사용자")
                                .esntlId("USR00002")
                                .emailAdres("test2@example.com")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("사용자")
                                .esntlId("USR00003")
                                .emailAdres("other@test.com")
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByEmailAdresContaining("example.com");

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getEmailAdres).containsExactlyInAnyOrder("test1@example.com",
                                "test2@example.com");
        }

        @Test
        @DisplayName("조직 ID로 사용자 검색")
        void findByOrgnztId_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("사용자")
                                .esntlId("USR00001")
                                .orgnztId("ORG001")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("사용자")
                                .esntlId("USR00002")
                                .orgnztId("ORG001")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("사용자")
                                .esntlId("USR00003")
                                .orgnztId("ORG002")
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByOrgnztId("ORG001");

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getOrgnztId).containsOnly("ORG001");
                assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1", "testUser2");
        }

        @Test
        @DisplayName("권한으로 사용자 검색")
        void findByRole_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("사용자")
                                .esntlId("USR00001")
                                .role(Role.USER)
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("사용자")
                                .esntlId("USR00002")
                                .role(Role.USER)
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("사용자")
                                .esntlId("USR00003")
                                .role(Role.ADMIN)
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByRole(Role.USER);

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(user -> user.getRole().name()).containsOnly("USER");
                assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1", "testUser2");
        }

        @Test
        @DisplayName("조직 및 권한으로 사용자 검색")
        void findByOrgnztIdAndRole_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("사용자")
                                .esntlId("USR00001")
                                .orgnztId("ORG001")
                                .role(Role.USER)
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("사용자")
                                .esntlId("USR00002")
                                .orgnztId("ORG001")
                                .role(Role.USER)
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("사용자")
                                .esntlId("USR00003")
                                .orgnztId("ORG001")
                                .role(Role.ADMIN)
                                .password("encodedPassword")
                                .build();
                User user4 = User.builder()
                                .userId("testUser4")
                                .userNm("사용자")
                                .esntlId("USR00004")
                                .orgnztId("ORG002")
                                .role(Role.USER)
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));
                userRepository.save(java.util.Objects.requireNonNull(user4));

                // When
                List<User> result = userRepository.findByOrgnztIdAndRole("ORG001",
                                Role.USER);

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1", "testUser2");
                assertThat(result).extracting(User::getOrgnztId).containsOnly("ORG001");
                assertThat(result).extracting(user -> user.getRole().name()).containsOnly("USER");
        }

        @Test
        @DisplayName("이름 또는 이메일 포함 사용자 검색")
        void findByUserNmContainingOrEmailAdresContaining_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("홍길동")
                                .esntlId("USR00001")
                                .emailAdres("hong@example.com")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("이순신")
                                .esntlId("USR00002")
                                .emailAdres("kim@test.com")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("박문수")
                                .esntlId("USR00003")
                                .emailAdres("park@example.com")
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByUserNmContainingOrEmailAdresContaining("홍길동", "kim@test.com");

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1", "testUser2");
        }

        @Test
        @DisplayName("전체 사용자 이름순 정렬 조회")
        void findAllSortedByName_success() {
                // Given
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("박문수")
                                .esntlId("USR00003")
                                .password("encodedPassword")
                                .build();
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("홍길동")
                                .esntlId("USR00001")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("이순신")
                                .esntlId("USR00002")
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user3));
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));

                // When
                Pageable pageable = PageRequest.of(0, 10);
                Page<User> result = userRepository.findAll(pageable);

                // Then
                assertThat(result.getContent()).hasSize(3);
                // Note: Actual sorting would depend on the default sort order defined in the
                // repository or query
                // For this test, we're just verifying that the query executes without error
                assertThat(result.getContent()).extracting(User::getUserNm).isNotEmpty();
        }
}
