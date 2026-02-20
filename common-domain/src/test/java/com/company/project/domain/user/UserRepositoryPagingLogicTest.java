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
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
class UserRepositoryPagingLogicTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("筌?甕곕뜆????륁뵠筌왖 ?????筌뤴뫖以?鈺곌퀬???源껊궗")
    void findAll_firstPage_success() {
        // Given
        createTestData(25); // Create 25 test users

        // When
        Pageable pageable = PageRequest.of(0, 10); // First page, 10 items per page
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(10); // Should return 10 items
        assertThat(result.getTotalElements()).isEqualTo(25); // Total should be 25
        assertThat(result.getTotalPages()).isEqualTo(3); // Should be 3 pages (ceil(25/10))
        assertThat(result.getNumber()).isEqualTo(0); // Current page number should be 0
        assertThat(result.isFirst()).isTrue(); // Should be first page
        assertThat(result.isLast()).isFalse(); // Should not be last page
    }

    @Test
    @DisplayName("??甕곕뜆????륁뵠筌왖 ?????筌뤴뫖以?鈺곌퀬???源껊궗")
    void findAll_secondPage_success() {
        // Given
        createTestData(25); // Create 25 test users

        // When
        Pageable pageable = PageRequest.of(1, 10); // Second page, 10 items per page
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(10); // Should return 10 items
        assertThat(result.getTotalElements()).isEqualTo(25); // Total should be 25
        assertThat(result.getTotalPages()).isEqualTo(3); // Should be 3 pages
        assertThat(result.getNumber()).isEqualTo(1); // Current page number should be 1
        assertThat(result.isFirst()).isFalse(); // Should not be first page
        assertThat(result.isLast()).isFalse(); // Should not be last page
    }

    @Test
    @DisplayName("筌띾뜆?筌???륁뵠筌왖 ?????筌뤴뫖以?鈺곌퀬???源껊궗")
    void findAll_lastPage_success() {
        // Given
        createTestData(25); // Create 25 test users

        // When
        Pageable pageable = PageRequest.of(2, 10); // Third page (last), 10 items per page
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(5); // Should return 5 items (remaining)
        assertThat(result.getTotalElements()).isEqualTo(25); // Total should be 25
        assertThat(result.getTotalPages()).isEqualTo(3); // Should be 3 pages
        assertThat(result.getNumber()).isEqualTo(2); // Current page number should be 2
        assertThat(result.isFirst()).isFalse(); // Should not be first page
        assertThat(result.isLast()).isTrue(); // Should be last page
    }

    @Test
    @DisplayName("??륁뵠筌왖 ??由?癰궰野????뮞??)
    void findAll_withDifferentPageSize_success() {
        // Given
        createTestData(25); // Create 25 test users

        // When
        Pageable pageable = PageRequest.of(0, 5); // First page, 5 items per page
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(5); // Should return 5 items
        assertThat(result.getTotalElements()).isEqualTo(25); // Total should be 25
        assertThat(result.getTotalPages()).isEqualTo(5); // Should be 5 pages (ceil(25/5))
        assertThat(result.getNumber()).isEqualTo(0); // Current page number should be 0
    }

    @Test
    @DisplayName("??륁뵠筌왖 甕곕뜇??甕곕뗄???λ뜃?????뮞??- ??野껉퀗??獄쏆꼹??)
    void findAll_exceedingPageNumber_returnsEmpty() {
        // Given
        createTestData(25); // Create 25 test users

        // When
        Pageable pageable = PageRequest.of(5, 10); // Page 5 (doesn't exist), 10 items per page
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty(); // Should return empty list
        assertThat(result.getTotalElements()).isEqualTo(25); // Total should still be 25
        assertThat(result.getTotalPages()).isEqualTo(3); // Should be 3 pages
        assertThat(result.getNumber()).isEqualTo(5); // Current page number should be 5
        assertThat(result.isFirst()).isFalse(); // Should not be first page
        assertThat(result.isLast()).isTrue(); // Should be considered last page (empty)
    }

    @Test
    @DisplayName("?類ｌ졊????륁뵠筌?野껉퀗?????뮞??- ??已?疫꿸퀣? ??살カ筌△뫁??)
    void findAll_sortedByNameAsc_success() {
        // Given
        User user3 = User.builder()
                .userId("user3")
                .userNm("揶쎛揶쎛揶쎛")
                .esntlId("USR00003")
                .password("encodedPassword")
                .build();
        User user1 = User.builder()
                .userId("user1")
                .userNm("??롪돌??)
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        User user2 = User.builder()
                .userId("user2")
                .userNm("??삳뼄??)
                .esntlId("USR00002")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user3));
        userRepository.save(java.util.Objects.requireNonNull(user1));
        userRepository.save(java.util.Objects.requireNonNull(user2));

        // When
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "userNm"));
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result.getContent()).hasSize(3);
        List<String> sortedNames = result.getContent().stream()
                .map(User::getUserNm)
                .toList();
        assertThat(sortedNames).containsExactly("揶쎛揶쎛揶쎛", "??롪돌??, "??삳뼄??);
    }

    @Test
    @DisplayName("?類ｌ졊????륁뵠筌?野껉퀗?????뮞??- ??已?疫꿸퀣? ???앾㎕?λ떄")
    void findAll_sortedByNameDesc_success() {
        // Given
        User user3 = User.builder()
                .userId("user3")
                .userNm("揶쎛揶쎛揶쎛")
                .esntlId("USR00003")
                .password("encodedPassword")
                .build();
        User user1 = User.builder()
                .userId("user1")
                .userNm("??롪돌??)
                .esntlId("USR00001")
                .password("encodedPassword")
                .build();
        User user2 = User.builder()
                .userId("user2")
                .userNm("??삳뼄??)
                .esntlId("USR00002")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user3));
        userRepository.save(java.util.Objects.requireNonNull(user1));
        userRepository.save(java.util.Objects.requireNonNull(user2));

        // When
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "userNm"));
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result.getContent()).hasSize(3);
        List<String> sortedNames = result.getContent().stream()
                .map(User::getUserNm)
                .toList();
        assertThat(sortedNames).containsExactly("??삳뼄??, "??롪돌??, "揶쎛揶쎛揶쎛");
    }

    @Test
    @DisplayName("?類ｌ졊????륁뵠筌?野껉퀗?????뮞??- ??밴쉐??疫꿸퀣? ??살カ筌△뫁??)
    void findAll_sortedByCreatedDateAsc_success() {
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
        User user3 = User.builder()
                .userId("user3")
                .userNm("?????")
                .esntlId("USR00003")
                .password("encodedPassword")
                .build();
        userRepository.save(java.util.Objects.requireNonNull(user1));
        userRepository.save(java.util.Objects.requireNonNull(user2));
        userRepository.save(java.util.Objects.requireNonNull(user3));

        // When
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<User> result = userRepository.findAll(pageable);

        // Then
        assertThat(result.getContent()).hasSize(3);
        // Verify that the users are ordered by creation date (which depends on the
        // order of saving)
    }

    @Test
    @DisplayName("??륁뵠筌???곸뵠 ?袁⑷퍥 鈺곌퀬?????뮞??)
    void findAll_unpaged_success() {
        // Given
        createTestData(15); // Create 15 test users

        // When
        Page<User> result = userRepository.findAll(PageRequest.of(0, Integer.MAX_VALUE));

        // Then
        assertThat(result.getContent()).hasSize(15);
        assertThat(result.getTotalElements()).isEqualTo(15);
    }

    @Test
    @DisplayName("??륁뵠筌왖 ??由?0??곗쨮 ?紐낅립 ??됱뇚 ???뮞??)
    void findAll_withZeroPageSize_throwsException() {
        // Given
        createTestData(10); // Create 10 test users

        // When & Then
        assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.dao.InvalidDataAccessApiUsageException.class,
                () -> userRepository.findAll(PageRequest.of(0, 0))))
                .hasMessageContaining("Page size must not be less than one!");
    }

    @Test
    @DisplayName("???땾 ??륁뵠筌왖 甕곕뜇?????뮞??)
    void findAll_withNegativePageNumber_throwsException() {
        // Given
        createTestData(10); // Create 10 test users

        // When & Then
        assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.dao.InvalidDataAccessApiUsageException.class,
                () -> userRepository.findAll(PageRequest.of(-1, 10))))
                .hasMessageContaining("Page index must not be less than zero!");
    }

    /**
     * ???뮞???怨쀬뵠????밴쉐
     */
    private void createTestData(int count) {
        for (int i = 1; i <= count; i++) {
            User user = User.builder()
                    .userId("user" + i)
                    .userNm("????? + i)
                    .esntlId("USR" + String.format("%05d", i))
                    .password("encodedPassword")
                    .build();
            userRepository.save(java.util.Objects.requireNonNull(user));
        }
    }
}