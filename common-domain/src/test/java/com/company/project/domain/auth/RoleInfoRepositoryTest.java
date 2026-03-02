package com.company.project.domain.auth;

import com.company.project.TestJpaConfig;
import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
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
@DisplayName("RoleInfoRepository 테스트")
class RoleInfoRepositoryTest {

    @Autowired
    private RoleInfoRepository roleInfoRepository;

    @Autowired
    private CommonCodeRepository commonCodeRepository;

    @Test
    @DisplayName("권한정보 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        RoleInfo roleInfo = RoleInfo.builder()
                .roleCode("ROLE_ADMIN")
                .roleNm("관리자")
                .rolePttrn("/admin/**")
                .roleDc("시스템 관리자 권한")
                .roleTy("GNR")
                .roleSort("1")
                .build();

        // When
        roleInfoRepository.save(roleInfo);
        Optional<RoleInfo> found = roleInfoRepository.findById("ROLE_ADMIN");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getRoleNm()).isEqualTo("관리자");
        assertThat(found.get().getRolePttrn()).isEqualTo("/admin/**");
    }

    @Test
    @DisplayName("권한명 키워드 검색 (JPA @Query) 확인")
    void searchByKeyword() {
        // Given
        roleInfoRepository.save(RoleInfo.builder().roleCode("R1").roleNm("User Role").build());
        roleInfoRepository.save(RoleInfo.builder().roleCode("R2").roleNm("Admin Role").build());

        // When
        Page<RoleInfo> result = roleInfoRepository.searchByKeyword("Admin", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRoleCode()).isEqualTo("R2");
    }

    @Test
    @DisplayName("권한 목록 조회 (QueryDSL Join) 확인")
    void selectRoleList() {
        // Given: CommonCode for Role Type Name join
        commonCodeRepository.save(CommonCode.builder()
                .codeGroupId("COM029")
                .code("GNR")
                .codeNm("일반권한")
                .build());

        roleInfoRepository.save(RoleInfo.builder()
                .roleCode("ROLE_USER")
                .roleNm("일반사용자")
                .roleTy("GNR")
                .build());

        // When
        Page<RoleInfoProjection> result = roleInfoRepository.selectRoleList("일반", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRoleNm()).isEqualTo("일반사용자");
        assertThat(result.getContent().get(0).getRoleTyNm()).isEqualTo("일반권한");
        // Note: Repository code does: commonCode.codeNm.as("roleTyNm")
        // and projections mapping might depends on how Projections.bean works.
    }

    @Test
    @DisplayName("권한 정보 수정 확인")
    void updateRoleInfo() {
        // Given
        RoleInfo role = RoleInfo.builder()
                .roleCode("ROLE_TEMP")
                .roleNm("임시권한")
                .build();
        roleInfoRepository.save(role);

        // When
        RoleInfo saved = roleInfoRepository.findById("ROLE_TEMP").orElseThrow();
        saved.update("수정권한", "/new/**", "수정설명", "USR", "2");
        roleInfoRepository.saveAndFlush(saved);

        // Then
        RoleInfo updated = roleInfoRepository.findById("ROLE_TEMP").orElseThrow();
        assertThat(updated.getRoleNm()).isEqualTo("수정권한");
        assertThat(updated.getRolePttrn()).isEqualTo("/new/**");
        assertThat(updated.getRoleTy()).isEqualTo("USR");
        assertThat(updated.getRoleSort()).isEqualTo("2");
    }
}
