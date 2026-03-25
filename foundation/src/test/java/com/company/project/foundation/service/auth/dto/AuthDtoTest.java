package com.company.project.foundation.service.auth.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Auth DTO 테스트")
class AuthDtoTest {

    @Test
    @DisplayName("LoginRequest 생성 테스트")
    void loginRequestTest() {
        LoginRequest request = new LoginRequest("user01", "pass123");
        assertThat(request.userId()).isEqualTo("user01");
        assertThat(request.password()).isEqualTo("pass123");
    }

    @Test
    @DisplayName("TokenResponse 생성 테스트")
    void tokenResponseTest() {
        TokenResponse response = new TokenResponse("atoken", "rtoken");
        assertThat(response.accessToken()).isEqualTo("atoken");
        assertThat(response.refreshToken()).isEqualTo("rtoken");
    }

    @Test
    @DisplayName("UserAuthorityDto 테스트")
    void userAuthorityDtoTest() {
        UserAuthorityDto dto = UserAuthorityDto.builder()
                .uniqId("UNIQ_001")
                .authorCode("ROLE_USER")
                .mberTyCode("USR")
                .userNm("홍길동")
                .build();

        assertThat(dto.getUniqId()).isEqualTo("UNIQ_001");
        assertThat(dto.getAuthorCode()).isEqualTo("ROLE_USER");
        assertThat(dto.getMberTyCode()).isEqualTo("USR");
        assertThat(dto.getUserNm()).isEqualTo("홍길동");

        dto.setUserNm("이순신");
        assertThat(dto.getUserNm()).isEqualTo("이순신");
    }

    @Test
    @DisplayName("AuthorManageDto 테스트")
    void authorManageDtoTest() {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authorCode("AUTH_001")
                .authorNm("관리자")
                .authorDc("시스템 관리자 권한")
                .authorCreatDe("2024-01-01")
                .build();

        assertThat(dto.getAuthorCode()).isEqualTo("AUTH_001");
        assertThat(dto.getAuthorNm()).isEqualTo("관리자");
        assertThat(dto.getAuthorDc()).isEqualTo("시스템 관리자 권한");
        assertThat(dto.getAuthorCreatDe()).isEqualTo("2024-01-01");
    }

    @Test
    @DisplayName("RoleManageDto 테스트")
    void roleManageDtoTest() {
        RoleManageDto dto = RoleManageDto.builder()
                .roleCode("ROLE_001")
                .roleNm("사용자역할")
                .rolePttrn("/api/user/**")
                .roleDc("일반사용자 역할")
                .roleTy("URL")
                .roleSort("1")
                .creatDt("2024-01-01")
                .build();

        assertThat(dto.getRoleCode()).isEqualTo("ROLE_001");
        assertThat(dto.getRoleNm()).isEqualTo("사용자역할");
        assertThat(dto.getRolePttrn()).isEqualTo("/api/user/**");
        assertThat(dto.getRoleDc()).isEqualTo("일반사용자 역할");
        assertThat(dto.getRoleTy()).isEqualTo("URL");
        assertThat(dto.getRoleSort()).isEqualTo("1");
        assertThat(dto.getCreatDt()).isEqualTo("2024-01-01");
        // Compatibility getters
        assertThat(dto.getRoleTyp()).isEqualTo("URL");
        assertThat(dto.getRoleCreatDe()).isEqualTo("2024-01-01");
        assertThat(dto.getRolePtn()).isEqualTo("/api/user/**");
    }
}
