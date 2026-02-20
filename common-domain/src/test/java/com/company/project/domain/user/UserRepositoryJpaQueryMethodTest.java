package com.company.project.domain.user;

import com.company.project.TestJpaConfig;
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
    @DisplayName("?????ID嚥??????鈺곌퀬???源껊궗")
    void findById_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("???뮞???????)
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user));

        // When
        Optional<User> result = userRepository.findById("testUser");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getUserNm()).isEqualTo("???뮞???????);
    }

    @Test
    @DisplayName("?⑥쥙? ID嚥??????鈺곌퀬???源껊궗")
    void findByEsntlId_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("???뮞???????)
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user));

        // When
        Optional<User> result = userRepository.findByEsntlId("USR00001");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getEsntlId()).isEqualTo("USR00001");
    }

    @Test
    @DisplayName("??已ユ???李??곗쨮 ?????鈺곌퀬???源껊궗")
    void findByUserNmAndEmailAdres_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("???뮞???????)
                .esntlId("USR00001")
                .emailAdres("test@example.com")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user));

        // When
        Optional<User> result = userRepository.findByUserNmAndEmailAdres("???뮞???????, "test@example.com");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getUserNm()).isEqualTo("???뮞???????);
        assertThat(result.get().getEmailAdres()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("?????ID?? ??已ユ???李??곗쨮 ?????鈺곌퀬???源껊궗")
    void findByUserIdAndUserNmAndEmailAdres_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("???뮞???????)
                .esntlId("USR00001")
                .emailAdres("test@example.com")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user));

        // When
        Optional<User> result = userRepository.findByUserIdAndUserNmAndEmailAdres("testUser", "???뮞???????,
                "test@example.com");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testUser");
        assertThat(result.get().getUserNm()).isEqualTo("???뮞???????);
        assertThat(result.get().getEmailAdres()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("鈺곕똻???? ??낅뮉 ?????ID嚥?鈺곌퀬??????野껉퀗??獄쏆꼹??)
    void findById_nonExistent_returnsEmpty() {
        // When
        Optional<User> result = userRepository.findById("nonexistent");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("鈺곕똻???? ??낅뮉 ?⑥쥙? ID嚥?鈺곌퀬??????野껉퀗??獄쏆꼹??)
    void findByEsntlId_nonExistent_returnsEmpty() {
        // When
        Optional<User> result = userRepository.findByEsntlId("USR_NONEXISTENT");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("鈺곕똻???? ??낅뮉 ??已ユ???李??곗쨮 鈺곌퀬??????野껉퀗??獄쏆꼹??)
    void findByUserNmAndEmailAdres_nonExistent_returnsEmpty() {
        // When
        Optional<User> result = userRepository.findByUserNmAndEmailAdres("??용뮉 ?????, "nonexistent@example.com");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("筌뤴뫀諭??????鈺곌퀬???源껊궗")
    void findAll_success() {
        // Given
        User user1 = User.builder()
                .userId("user1")
                .userNm("?????")
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        User user2 = User.builder()
                .userId("user2")
                .userNm("?????")
                .esntlId("USR00002")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user1));
        userRepository.save(java.util.Objects.requireNonNull(user2));

        // When
        List<User> result = userRepository.findAll();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).extracting(User::getUserId).containsExactlyInAnyOrder("user1", "user2");
    }

    @Test
    @DisplayName("?????ID 鈺곕똻????? ?類ㅼ뵥 ?源껊궗")
    void existsById_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("???뮞???????)
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user));

        // When
        boolean exists = userRepository.existsById("testUser");

        // Then
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("鈺곕똻???? ??낅뮉 ?????ID 鈺곕똻????? ?類ㅼ뵥")
    void existsById_nonExistent_returnsFalse() {
        // When
        boolean exists = userRepository.existsById("nonexistent");

        // Then
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("??????????源껊궗")
    void save_success() {
        // Given
        User user = User.builder()
                .userId("newUser")
                .userNm("?醫됲뇣 ?????)
                .esntlId("USR_NEW001")
                .password("encodedPassword")
                .build();

        // When
        User savedUser = java.util.Objects.requireNonNull(userRepository.save(java.util.Objects.requireNonNull(user)));

        // Then
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getUserId()).isEqualTo("newUser");
        assertThat(savedUser.getUserNm()).isEqualTo("?醫됲뇣 ?????);
        assertThat(savedUser.getEsntlId()).isEqualTo("USR_NEW001");
    }

    @Test
    @DisplayName("???????낅쑓??꾨뱜 ?源껊궗")
    void update_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("???뮞???????)
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        User savedUser = java.util.Objects.requireNonNull(userRepository.save(java.util.Objects.requireNonNull(user)));

        // When
        savedUser.update("??륁젟???????, "hint", "answer", "empNo", "ihidnum", "M", "1990-01-01", "02", "123", "456",
                "010-1234-5678", "homeadres", "detailAdres", "zip", "offmTelno", "moblphonNo", "test@test.com", "?⑥눘??,
                "GRP001", "ORG001", "INST001", com.company.project.domain.user.Role.USER, "subDn");
        User updatedUser = java.util.Objects
                .requireNonNull(userRepository.save(java.util.Objects.requireNonNull(savedUser)));

        // Then
        assertThat(updatedUser.getUserNm()).isEqualTo("??륁젟???????);
    }

    @Test
    @DisplayName("??????????源껊궗")
    void deleteById_success() {
        // Given
        User user = User.builder()
                .userId("testUser")
                .userNm("???뮞???????)
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user));

        // When
        userRepository.deleteById("testUser");

        // Then
        Optional<User> result = userRepository.findById("testUser");
        assertThat(result).isEmpty();
    }
}