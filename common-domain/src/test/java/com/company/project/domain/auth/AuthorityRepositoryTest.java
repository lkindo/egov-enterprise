package com.company.project.domain.auth;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("AuthorityRepository 테스트")
class AuthorityRepositoryTest {

    @Autowired
    private AuthorityRepository authorityRepository;

    @Test
    @DisplayName("권한 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        Authority authority = Authority.builder()
                .authorCode("AUTH_001")
                .authorNm("관리권한")
                .authorDc("시스템 관리 권한")
                .build();

        // When
        authorityRepository.save(authority);
        Optional<Authority> found = authorityRepository.findById("AUTH_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getAuthorNm()).isEqualTo("관리권한");
    }

    @Test
    @DisplayName("권한명 검색 확인")
    void searchAuthorities() {
        // Given
        authorityRepository.save(Authority.builder().authorCode("A1").authorNm("User Auth").build());
        authorityRepository.save(Authority.builder().authorCode("A2").authorNm("Admin Auth").build());

        // When
        Page<Authority> result = authorityRepository.searchAuthorities("1", "Admin", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAuthorCode()).isEqualTo("A2");
    }

    @Test
    @DisplayName("권한 수정 확인")
    void updateAuthority() {
        // Given
        Authority auth = Authority.builder().authorCode("A3").authorNm("Old Auth").build();
        authorityRepository.save(auth);

        // When
        Authority saved = authorityRepository.findById("A3").orElseThrow();
        saved.update("New Auth", "Updated Description");
        authorityRepository.saveAndFlush(saved);

        // Then
        Authority updated = authorityRepository.findById("A3").orElseThrow();
        assertThat(updated.getAuthorNm()).isEqualTo("New Auth");
        assertThat(updated.getAuthorDc()).isEqualTo("Updated Description");
    }
}
