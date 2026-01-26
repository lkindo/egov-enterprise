package com.company.project.service.auth;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@EntityScan("com.company.project.domain")
@EnableJpaRepositories("com.company.project.domain")
@Import(AuthorManageService.class)
class AuthorManageServiceTest {

    @Autowired
    private AuthorManageService authorManageService;

    @Autowired
    private AuthorityRepository authorityRepository;

    @BeforeEach
    void setUp() {
        authorityRepository.deleteAll();
    }

    @Test
    void deleteAuthors_shouldDeleteSpecifiedAuthors() {
        // given
        List<Authority> authorities = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            authorities.add(Authority.builder()
                    .authorCode("AUTH_" + i)
                    .authorNm("Test Authority " + i)
                    .authorDc("Description " + i)
                    .build());
        }
        authorityRepository.saveAll(authorities);

        String[] codesToDelete = {"AUTH_0", "AUTH_1", "AUTH_2"};

        // when
        authorManageService.deleteAuthors(codesToDelete);

        // then
        assertThat(authorityRepository.existsById("AUTH_0")).isFalse();
        assertThat(authorityRepository.existsById("AUTH_1")).isFalse();
        assertThat(authorityRepository.existsById("AUTH_2")).isFalse();
        assertThat(authorityRepository.existsById("AUTH_3")).isTrue();
        assertThat(authorityRepository.existsById("AUTH_4")).isTrue();
    }

    @Test
    void deleteAuthors_shouldHandleEmptyArray() {
        // given
        Authority auth = Authority.builder().authorCode("AUTH_X").authorNm("X").build();
        authorityRepository.save(auth);

        // when
        authorManageService.deleteAuthors(new String[]{});

        // then
        assertThat(authorityRepository.existsById("AUTH_X")).isTrue();
    }
}
