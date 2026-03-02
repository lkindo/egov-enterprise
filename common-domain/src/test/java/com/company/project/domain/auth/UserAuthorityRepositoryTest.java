package com.company.project.domain.auth;

import com.company.project.TestJpaConfig;
import com.company.project.domain.user.entity.DeptManage;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.DeptManageRepository;
import com.company.project.domain.user.repository.UserRepository;
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
@DisplayName("UserAuthorityRepository 테스트")
class UserAuthorityRepositoryTest {

    @Autowired
    private UserAuthorityRepository userAuthorityRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DeptManageRepository deptManageRepository;

    @Test
    @DisplayName("사용자 권한 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        UserAuthority userAuthority = UserAuthority.builder()
                .uniqId("USR_0001")
                .authorCode("ROLE_USER")
                .mberTyCode("USR03")
                .build();

        // When
        userAuthorityRepository.save(userAuthority);
        Optional<UserAuthority> found = userAuthorityRepository.findById("USR_0001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("권한 그룹 검색 (사용자 기반 Join) 확인")
    void searchAuthorGroups() {
        // Given
        User user = User.builder()
                .esntlId("USR_0001")
                .userId("testuser")
                .userNm("테스트")
                .password("pw123")
                .groupId("GROUP01")
                .build();
        userRepository.save(user);

        userAuthorityRepository.save(UserAuthority.builder()
                .uniqId("USR_0001")
                .authorCode("ROLE_ADMIN")
                .build());

        // When
        Page<AuthorGroupProjection> result = userAuthorityRepository.searchAuthorGroups("1", "testuser",
                PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("testuser");
        assertThat(result.getContent().get(0).getAuthorCode()).isEqualTo("ROLE_ADMIN");
        assertThat(result.getContent().get(0).getRegYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("부서별 권한 검색 확인")
    void searchDeptAuthors() {
        // Given
        DeptManage dept = DeptManage.builder()
                .orgnztId("DEPT01")
                .orgnztNm("개발팀")
                .build();
        deptManageRepository.save(dept);

        User user = User.builder()
                .esntlId("USR_0002")
                .userId("devuser")
                .userNm("개발자")
                .password("pw123")
                .orgnztId("DEPT01")
                .build();
        userRepository.save(user);

        userAuthorityRepository.save(UserAuthority.builder()
                .uniqId("USR_0002")
                .authorCode("ROLE_DEV")
                .build());

        // When
        Page<DeptAuthorProjection> result = userAuthorityRepository.searchDeptAuthors("DEPT01", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getDeptNm()).isEqualTo("개발팀");
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("devuser");
        assertThat(result.getContent().get(0).getRegYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("사용자 권한 정보 수정 확인")
    void updateUserAuthority() {
        // Given
        UserAuthority auth = UserAuthority.builder()
                .uniqId("USR_0003")
                .authorCode("ROLE_GUEST")
                .build();
        userAuthorityRepository.save(auth);

        // When
        UserAuthority saved = userAuthorityRepository.findById("USR_0003").orElseThrow();
        saved.update("ROLE_USER", "USR02");
        userAuthorityRepository.saveAndFlush(saved);

        // Then
        UserAuthority updated = userAuthorityRepository.findById("USR_0003").orElseThrow();
        assertThat(updated.getAuthorCode()).isEqualTo("ROLE_USER");
        assertThat(updated.getMberTyCode()).isEqualTo("USR02");
    }
}
