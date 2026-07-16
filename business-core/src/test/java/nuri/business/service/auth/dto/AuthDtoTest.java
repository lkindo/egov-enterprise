package nuri.business.service.auth.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuthDtoTest {

    @Test
    @DisplayName("RoleManageDto 빌더 및 Getter/Setter 테스트")
    void roleManageDtoTest() {
        RoleManageDto dto = RoleManageDto.builder()
                .roleId("ROLE_USER")
                .roleNm("사용자")
                .rolePatrn("/api/**")
                .roleExpln("사용자 권한")
                .roleTypeCd("URL")
                .roleSort("1")
                .crtDt("2024-01-01")
                .build();

        // Standardized getters
        assertThat(dto.getRoleId()).isEqualTo("ROLE_USER");
        assertThat(dto.getRoleNm()).isEqualTo("사용자");
        assertThat(dto.getRolePatrn()).isEqualTo("/api/**");
        assertThat(dto.getRoleExpln()).isEqualTo("사용자 권한");
        assertThat(dto.getRoleTypeCd()).isEqualTo("URL");
        assertThat(dto.getRoleSort()).isEqualTo("1");
        assertThat(dto.getCrtDt()).isEqualTo("2024-01-01");
    }
}
