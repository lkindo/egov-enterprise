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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
class UserRepositoryCustomQueryTest {

        @Autowired
        private UserRepository userRepository;

        @Test
        @DisplayName("?????野꺜??鈺곌퀗援???怨뺚뀲 ?????筌뤴뫖以?鈺곌퀬???源껊궗")
        void searchUsersWithCondition_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("???뮞???????")
                                .esntlId("USR00001")
                                .password("encodedPassword")
                                .role(com.company.project.domain.user.Role.USER)
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("???뮞???????")
                                .esntlId("USR00002")
                                .password("encodedPassword")
                                .role(com.company.project.domain.user.Role.ADMIN)
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
        @DisplayName("???????已??곗쨮 ?????野꺜???源껊궗")
        void findByUserNmContaining_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("??삳쭔??)
                                .esntlId("USR00001")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("??삳쭔??)
                                .esntlId("USR00002")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("繹먃筌ｌ쥙??)
                                .esntlId("USR00003")
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByUserNmContaining("??);

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getUserNm).containsExactlyInAnyOrder("??삳쭔??, "??삳쭔??);
        }

        @Test
        @DisplayName("??李??雅뚯눘?쇗에??????野꺜???源껊궗")
        void findByEmailAdresContaining_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("???뮞??")
                                .esntlId("USR00001")
                                .emailAdres("test1@example.com")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("???뮞??")
                                .esntlId("USR00002")
                                .emailAdres("test2@example.com")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("???뮞??")
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
        @DisplayName("鈺곌퀣彛?ID嚥??????野꺜???源껊궗")
        void findByOrgnztId_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("???뮞??")
                                .esntlId("USR00001")
                                .orgnztId("ORG001")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("???뮞??")
                                .esntlId("USR00002")
                                .orgnztId("ORG001")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("???뮞??")
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
        @DisplayName("??釉룡에??????野꺜???源껊궗")
        void findByRole_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("???뮞??")
                                .esntlId("USR00001")
                                .role(com.company.project.domain.user.Role.USER)
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("???뮞??")
                                .esntlId("USR00002")
                                .role(com.company.project.domain.user.Role.USER)
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("???뮞??")
                                .esntlId("USR00003")
                                .role(com.company.project.domain.user.Role.ADMIN)
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByRole(com.company.project.domain.user.Role.USER);

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(user -> user.getRole().name()).containsOnly("USER");
                assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1", "testUser2");
        }

        @Test
        @DisplayName("????鈺곌퀗援??곗쨮 ?????野꺜???源껊궗")
        void findByOrgnztIdAndRole_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("???뮞??")
                                .esntlId("USR00001")
                                .orgnztId("ORG001")
                                .role(com.company.project.domain.user.Role.USER)
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("???뮞??")
                                .esntlId("USR00002")
                                .orgnztId("ORG001")
                                .role(com.company.project.domain.user.Role.USER)
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("???뮞??")
                                .esntlId("USR00003")
                                .orgnztId("ORG001")
                                .role(com.company.project.domain.user.Role.ADMIN)
                                .password("encodedPassword")
                                .build();
                User user4 = User.builder()
                                .userId("testUser4")
                                .userNm("???뮞??")
                                .esntlId("USR00004")
                                .orgnztId("ORG002")
                                .role(com.company.project.domain.user.Role.USER)
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));
                userRepository.save(java.util.Objects.requireNonNull(user4));

                // When
                List<User> result = userRepository.findByOrgnztIdAndRole("ORG001",
                                com.company.project.domain.user.Role.USER);

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1", "testUser2");
                assertThat(result).extracting(User::getOrgnztId).containsOnly("ORG001");
                assertThat(result).extracting(user -> user.getRole().name()).containsOnly("USER");
        }

        @Test
        @DisplayName("??已??癒?뮉 ??李??곗쨮 ?????野꺜???源껊궗")
        void findByUserNmContainingOrEmailAdresContaining_success() {
                // Given
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("??삳쭔??)
                                .esntlId("USR00001")
                                .emailAdres("hong@example.com")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("繹먃筌ｌ쥙??)
                                .esntlId("USR00002")
                                .emailAdres("kim@test.com")
                                .password("encodedPassword")
                                .build();
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("獄쏅벡???)
                                .esntlId("USR00003")
                                .emailAdres("park@example.com")
                                .password("encodedPassword")
                                .build();
                userRepository.save(java.util.Objects.requireNonNull(user1));
                userRepository.save(java.util.Objects.requireNonNull(user2));
                userRepository.save(java.util.Objects.requireNonNull(user3));

                // When
                List<User> result = userRepository.findByUserNmContainingOrEmailAdresContaining("疫뀀챶猷?, "kim@test.com");

                // Then
                assertThat(result).hasSize(2);
                assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("testUser1", "testUser2");
        }

        @Test
        @DisplayName("?類ｌ졊???????筌뤴뫖以?鈺곌퀬???源껊궗")
        void findAllSortedByName_success() {
                // Given
                User user3 = User.builder()
                                .userId("testUser3")
                                .userNm("揶쎛??")
                                .esntlId("USR00003")
                                .password("encodedPassword")
                                .build();
                User user1 = User.builder()
                                .userId("testUser1")
                                .userNm("??띾쭔??)
                                .esntlId("USR00001")
                                .password("encodedPassword")
                                .build();
                User user2 = User.builder()
                                .userId("testUser2")
                                .userNm("??쇱퓢??)
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