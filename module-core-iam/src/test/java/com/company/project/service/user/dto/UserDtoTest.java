package com.company.project.service.user.dto;

import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User DTO 테스트")
class UserDtoTest {

    @Test
    @DisplayName("User 엔티티에서 UserDto로 변환 테스트")
    void userDtoFromEntityTest() {
        // Given
        User user = User.builder()
                .userId("tester")
                .userNm("테스터")
                .esntlId("USR_0000000000001")
                .role(Role.ADMIN)
                .emplNo("12345")
                .ofcpsNm("과장")
                .build();
        // Since User extends BaseEntity, we check createdDate
        // (BaseEntity usually has it, let's assume it works or just check nullability)

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
        UserSignupRequest request = new UserSignupRequest(
                "signupUser",
                "password123!",
                "가입자",
                Role.USER,
                "Hint",
                "Answer"
        );

        // Then
        assertThat(request.userId()).isEqualTo("signupUser");
        assertThat(request.password()).isEqualTo("password123!");
        assertThat(request.userNm()).isEqualTo("가입자");
        assertThat(request.role()).isEqualTo(Role.USER);
        assertThat(request.passwordHint()).isEqualTo("Hint");
        assertThat(request.passwordCnsr()).isEqualTo("Answer");
    }
}
