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
@DisplayName("AuthorityRoleRepository 테스트")
class AuthorityRoleRepositoryTest {

    @Autowired
    private AuthorityRoleRepository authorityRoleRepository;

    @Autowired
    private RoleInfoRepository roleInfoRepository;

    @Test
    @DisplayName("권한-롤 관계 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        AuthorityRole.AuthorityRoleId id = AuthorityRole.AuthorityRoleId.builder()
                .authorCode("AUTH01")
                .roleCode("ROLE01")
                .build();
        AuthorityRole entity = AuthorityRole.builder().id(id).build();

        // When
        authorityRoleRepository.save(entity);
        Optional<AuthorityRole> found = authorityRoleRepository.findById(id);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getId().getAuthorCode()).isEqualTo("AUTH01");
        assertThat(found.get().getCreatDt()).isNotNull();
    }

    @Test
    @DisplayName("권한별 롤 목록 검색 확인")
    void searchAuthorRoles() {
        // Given
        roleInfoRepository.save(RoleInfo.builder()
                .roleCode("ROLE_1")
                .roleNm("Role 1")
                .roleSort("1")
                .build());
        roleInfoRepository.save(RoleInfo.builder()
                .roleCode("ROLE_2")
                .roleNm("Role 2")
                .roleSort("2")
                .build());

        AuthorityRole.AuthorityRoleId id = AuthorityRole.AuthorityRoleId.builder()
                .authorCode("AUTH_MGR")
                .roleCode("ROLE_1")
                .build();
        authorityRoleRepository.save(AuthorityRole.builder().id(id).build());

        // When
        Page<AuthorRoleProjection> result = authorityRoleRepository.searchAuthorRoles("AUTH_MGR",
                PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(2);

        AuthorRoleProjection p1 = result.getContent().stream()
                .filter(p -> p.getRoleCode().equals("ROLE_1"))
                .findFirst().orElseThrow();
        assertThat(p1.getRegYn()).isEqualTo("Y");
        assertThat(p1.getAuthorCode()).isEqualTo("AUTH_MGR");

        AuthorRoleProjection p2 = result.getContent().stream()
                .filter(p -> p.getRoleCode().equals("ROLE_2"))
                .findFirst().orElseThrow();
        assertThat(p2.getRegYn()).isEqualTo("N");
        assertThat(p2.getAuthorCode()).isNull();
    }
}
