package nuri.foundation.service.user.dto;

import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User DTO (사용자 DTO) 테스트")
class UserDtoTest {

    @Test
    @DisplayName("User 엔티티에서 UserDto로 변환 테스트")
    void userDtoFromEntityTest() {
        // Given
        User user = User.builder()
                .userId("tester")
                .userNm("테스터")
                .esntlId("USR_0000000000001")
                .password("password") // Fixed: Add required field
                .role(Role.ADMIN)
                .emplNo("12345")
                .ofcpsNm("과장")
                .build();

        // When
        UserDto dto = UserDto.from(user);

        // Then
        assertThat(dto.getUserId()).isEqualTo("tester");
        assertThat(dto.getUserNm()).isEqualTo("테스터");
        assertThat(dto.getEsntlId()).isEqualTo("USR_0000000000001");
        assertThat(dto.getRole()).isEqualTo("ADMIN");
        assertThat(dto.getEmplNo()).isEqualTo("12345");
        assertThat(dto.getOfcpsNm()).isEqualTo("과장");
    }

    @Test
    @DisplayName("null User 엔티티 변환 테스트")
    void userDtoFromNullEntityTest() {
        assertThat(UserDto.from(null)).isNull();
    }

    @Test
    @DisplayName("UserSignupRequest 생성 테스트")
    void userSignupRequestTest() {
        // Given & When
        UserSignupRequest request = UserSignupRequest.builder()
                .userId("signupUser")
                .password("password123!")
                .userNm("가입자")
                .role("USER")
                .passwordHint("Hint")
                .passwordCnsr("Answer")
                .build();

        // Then
        assertThat(request.getUserId()).isEqualTo("signupUser");
        assertThat(request.getPassword()).isEqualTo("password123!");
        assertThat(request.getUserNm()).isEqualTo("가입자");
        assertThat(request.getRole()).isEqualTo("USER");
        assertThat(request.getPasswordHint()).isEqualTo("Hint");
        assertThat(request.getPasswordCnsr()).isEqualTo("Answer");
    }
}
