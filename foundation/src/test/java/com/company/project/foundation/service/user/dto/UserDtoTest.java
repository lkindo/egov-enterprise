package com.company.project.foundation.service.user.dto;

import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User DTO ?ŒìŠ¤??)
class UserDtoTest {

    @Test
    @DisplayName("User ?”í‹°?°ì—??UserDtoë¡?ë³€???ŒìŠ¤??)
    void userDtoFromEntityTest() {
        // Given
        User user = User.builder()
                .userId("tester")
                .userNm("?ŒìŠ¤??)
                .esntlId("USR_0000000000001")
                .password("password") // Fixed: Add required field
                .role(Role.ADMIN)
                .emplNo("12345")
                .ofcpsNm("ê³¼ì¥")
                .build();

        // When
        UserDto dto = UserDto.from(user);

        // Then
        assertThat(dto.getUserId()).isEqualTo("tester");
        assertThat(dto.getUserNm()).isEqualTo("?ŒìŠ¤??);
        assertThat(dto.getEsntlId()).isEqualTo("USR_0000000000001");
        assertThat(dto.getRole()).isEqualTo("ADMIN");
        assertThat(dto.getEmplNo()).isEqualTo("12345");
        assertThat(dto.getOfcpsNm()).isEqualTo("ê³¼ì¥");
    }

    @Test
    @DisplayName("null User ?”í‹°??ë³€???ŒìŠ¤??)
    void userDtoFromNullEntityTest() {
        assertThat(UserDto.from(null)).isNull();
    }

    @Test
    @DisplayName("UserSignupRequest ?ì„± ?ŒìŠ¤??)
    void userSignupRequestTest() {
        // Given & When
        UserSignupRequest request = new UserSignupRequest(
                "signupUser",
                "password123!",
                "ê°€?…ì",
                Role.USER,
                "Hint",
                "Answer"
        );

        // Then
        assertThat(request.userId()).isEqualTo("signupUser");
        assertThat(request.password()).isEqualTo("password123!");
        assertThat(request.userNm()).isEqualTo("ê°€?…ì");
        assertThat(request.role()).isEqualTo(Role.USER);
        assertThat(request.passwordHint()).isEqualTo("Hint");
        assertThat(request.passwordCnsr()).isEqualTo("Answer");
    }
}
