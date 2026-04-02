package com.company.project.foundation.service.auth.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Auth DTO ?åÏä§??)
class AuthDtoTest {

    @Test
    @DisplayName("LoginRequest ?ùÏÑ± ?åÏä§??)
    void loginRequestTest() {
        LoginRequest request = new LoginRequest("user01", "pass123");
        assertThat(request.userId()).isEqualTo("user01");
        assertThat(request.password()).isEqualTo("pass123");
    }

    @Test
    @DisplayName("TokenResponse ?ùÏÑ± ?åÏä§??)
    void tokenResponseTest() {
        TokenResponse response = new TokenResponse("atoken", "rtoken", "ROLE_USER");
        assertThat(response.accessToken()).isEqualTo("atoken");
        assertThat(response.refreshToken()).isEqualTo("rtoken");
        assertThat(response.role()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("UserAuthorityDto ?åÏä§??)
    void userAuthorityDtoTest() {
        UserAuthorityDto dto = UserAuthorityDto.builder()
                .uniqId("UNIQ_001")
                .authorCode("ROLE_USER")
                .mberTyCode("USR")
                .userNm("?çÍ∏∏??)
                .build();

        assertThat(dto.getUniqId()).isEqualTo("UNIQ_001");
        assertThat(dto.getAuthorCode()).isEqualTo("ROLE_USER");
        assertThat(dto.getMberTyCode()).isEqualTo("USR");
        assertThat(dto.getUserNm()).isEqualTo("?çÍ∏∏??);

        dto.setUserNm("?¥Ïàú??);
        assertThat(dto.getUserNm()).isEqualTo("?¥Ïàú??);
    }

    @Test
    @DisplayName("AuthorManageDto ?åÏä§??)
    void authorManageDtoTest() {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authorCode("AUTH_001")
                .authorNm("Í¥ÄÎ¶¨Ïûê")
                .authorDc("?úÏä§??Í¥ÄÎ¶¨Ïûê Í∂åÌïú")
                .authorCreatDe("2024-01-01")
                .build();

        assertThat(dto.getAuthorCode()).isEqualTo("AUTH_001");
        assertThat(dto.getAuthorNm()).isEqualTo("Í¥ÄÎ¶¨Ïûê");
        assertThat(dto.getAuthorDc()).isEqualTo("?úÏä§??Í¥ÄÎ¶¨Ïûê Í∂åÌïú");
        assertThat(dto.getAuthorCreatDe()).isEqualTo("2024-01-01");
    }

    @Test
    @DisplayName("RoleManageDto ?åÏä§??)
    void roleManageDtoTest() {
        RoleManageDto dto = RoleManageDto.builder()
                .roleCode("ROLE_001")
                .roleNm("?¨Ïö©?êÏó≠??)
                .rolePttrn("/api/user/**")
                .roleDc("?ºÎ∞ò?¨Ïö©????ï†")
                .roleTy("URL")
                .roleSort("1")
                .creatDt("2024-01-01")
                .build();

        assertThat(dto.getRoleCode()).isEqualTo("ROLE_001");
        assertThat(dto.getRoleNm()).isEqualTo("?¨Ïö©?êÏó≠??);
        assertThat(dto.getRolePttrn()).isEqualTo("/api/user/**");
        assertThat(dto.getRoleDc()).isEqualTo("?ºÎ∞ò?¨Ïö©????ï†");
        assertThat(dto.getRoleTy()).isEqualTo("URL");
        assertThat(dto.getRoleSort()).isEqualTo("1");
        assertThat(dto.getCreatDt()).isEqualTo("2024-01-01");
        // Compatibility getters
        assertThat(dto.getRoleTyp()).isEqualTo("URL");
        assertThat(dto.getRoleCreatDe()).isEqualTo("2024-01-01");
        assertThat(dto.getRolePtn()).isEqualTo("/api/user/**");
    }
}
