package com.company.project.domain.user;

import com.company.project.config.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
class UserRepositoryJpaQueryMethodTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("사용자 ID로 사용자 조회 성공")
    void findById_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(user);

        // When
        Optional<User> result = userRepository.findById("testUser");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getUserNm()).isEqualTo("테스트 사용자");
    }

    @Test
    @DisplayName("고유 ID로 사용자 조회 성공")
    void findByEsntlId_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(user);

        // When
        Optional<User> result = userRepository.findByEsntlId("USR00001");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getEsntlId()).isEqualTo("USR00001");
    }

    @Test
    @DisplayName("이름과 이메일로 사용자 조회 성공")
    void findByUserNmAndEmailAdres_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .emailAdres("test@example.com")
                .password("encodedPassword")
                .build();
        userRepository.save(user);

        // When
        Optional<User> result = userRepository.findByUserNmAndEmailAdres("테스트 사용자", "test@example.com");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getUserNm()).isEqualTo("테스트 사용자");
        assertThat(result.get().getEmailAdres()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("사용자 ID와 이름과 이메일로 사용자 조회 성공")
    void findByUserIdAndUserNmAndEmailAdres_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .emailAdres("test@example.com")
                .password("encodedPassword")
                .build();
        userRepository.save(user);

        // When
        Optional<User> result = userRepository.findByUserIdAndUserNmAndEmailAdres("testUser", "테스트 사용자", "test@example.com");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getUserNm()).isEqualTo("테스트 사용자");
        assertThat(result.get().getEmailAdres()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("존재하지 않는 사용자 ID로 조회 시 빈 결과 반환")
    void findById_nonExistent_returnsEmpty() {
        // When
        Optional<User> result = userRepository.findById("nonexistent");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 고유 ID로 조회 시 빈 결과 반환")
    void findByEsntlId_nonExistent_returnsEmpty() {
        // When
        Optional<User> result = userRepository.findByEsntlId("USR_NONEXISTENT");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 이름과 이메일로 조회 시 빈 결과 반환")
    void findByUserNmAndEmailAdres_nonExistent_returnsEmpty() {
        // When
        Optional<User> result = userRepository.findByUserNmAndEmailAdres("없는 사용자", "nonexistent@example.com");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("모든 사용자 조회 성공")
    void findAll_success() {
        // Given
        User user1 = User.builder()
                .userId("user1")
                .userNm("사용자1")
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        User user2 = User.builder()
                .userId("user2")
                .userNm("사용자2")
                .esntlId("USR00002")
                .password("encodedPassword")
                .build();
        userRepository.save(user1);
        userRepository.save(user2);

        // When
        List<User> result = userRepository.findAll();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("user1", "user2");
    }

    @Test
    @DisplayName("사용자 ID 존재 여부 확인 성공")
    void existsById_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(user);

        // When
        boolean exists = userRepository.existsById("testUser");

        // Then
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("존재하지 않는 사용자 ID 존재 여부 확인")
    void existsById_nonExistent_returnsFalse() {
        // When
        boolean exists = userRepository.existsById("nonexistent");

        // Then
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("사용자 저장 성공")
    void save_success() {
        // Given
        User user = User.builder()
                .userId("newUser")
                .userNm("신규 사용자")
                .esntlId("USR_NEW001")
                .password("encodedPassword")
                .build();

        // When
        User savedUser = userRepository.save(user);

        // Then
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getUserId()).isEqualTo("newUser");
        assertThat(savedUser.getUserNm()).isEqualTo("신규 사용자");
        assertThat(savedUser.getEsntlId()).isEqualTo("USR_NEW001");
    }

    @Test
    @DisplayName("사용자 업데이트 성공")
    void update_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        User savedUser = userRepository.save(user);

        // When
        savedUser.update("수정된 사용자", "hint", "answer", "empNo", "ihidnum", "M", "1990-01-01", "02", "123", "456", "010-1234-5678", "test@test.com", "과장", "GRP001", "ORG001", "INST001", com.company.project.domain.user.Role.USER, "subDn");
        User updatedUser = userRepository.save(savedUser);

        // Then
        assertThat(updatedUser.getUserNm()).isEqualTo("수정된 사용자");
    }

    @Test
    @DisplayName("사용자 삭제 성공")
    void deleteById_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(user);

        // When
        userRepository.deleteById("testUser");

        // Then
        Optional<User> result = userRepository.findById("testUser");
        assertThat(result).isEmpty();
    }
}