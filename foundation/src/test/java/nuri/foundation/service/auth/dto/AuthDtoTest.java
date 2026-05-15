package nuri.foundation.service.auth.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuthDtoTest {

    @Test
    @DisplayName("RoleManageDto 빌더 및 Getter/Setter 테스트")
    void roleManageDtoTest() {
        RoleManageDto dto = RoleManageDto.builder()
                .roleCode("ROLE_USER")
                .roleNm("사용자")
                .rolePttrn("/api/**")
                .roleDc("사용자 권한")
                .roleTy("URL")
                .roleSort("1")
                .creatDt("2024-01-01")
                .build();

        assertThat(dto.getRoleCode()).isEqualTo("ROLE_USER");
        assertThat(dto.getRoleNm()).isEqualTo("사용자");
        assertThat(dto.getRolePttrn()).isEqualTo("/api/**");
        assertThat(dto.getRoleDc()).isEqualTo("사용자 권한");
        assertThat(dto.getRoleTy()).isEqualTo("URL");
        assertThat(dto.getRoleSort()).isEqualTo("1");
        assertThat(dto.getCreatDt()).isEqualTo("2024-01-01");
    }
}
