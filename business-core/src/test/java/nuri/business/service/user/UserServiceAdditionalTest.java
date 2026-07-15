package nuri.business.service.user;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.user.dto.UserDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService (사용자 관리 추가 기능) 테스트")
class UserServiceAdditionalTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, userAuthorityRepository, passwordEncoder);
    }

    private User.UserBuilder createBaseUser(String userId) {
        return User.builder()
                .userId(userId)
                .esntlId("ESNTL_" + userId)
                .userNm("Name_" + userId)
                .pswd("password");
    }

    private UserDto.UserDtoBuilder createBaseUserDto(String userId) {
        return UserDto.builder()
                .userId(userId)
                .esntlId("ESNTL_" + userId)
                .userNm("Name_" + userId);
    }

    @Test
    @DisplayName("사용자 정보 수정 성공")
    void updateUser_success() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("ADMIN"));
            // Given
            String userId = "testUser";
            User user = createBaseUser(userId)
                    .userNm("Old Name")
                    .build();
            UserDto updateDto = createBaseUserDto(userId)
                    .userNm("New Name")
                    .emplNo("EMP001")
                    .ofcpsNm("Manager")
                    .build();

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            userService.updateUser(userId, updateDto);

            // Then
            assertThat(user.getUserNm()).isEqualTo("New Name");
            assertThat(user.getEmplNo()).isEqualTo("EMP001");
            assertThat(user.getOfcpsNm()).isEqualTo("Manager");
        }
    }

    @Test
    @DisplayName("사용자 정보 수정 실패 - 존재하지 않는 사용자")
    void updateUser_fail_userNotFound() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("ADMIN"));
            // Given
            String userId = "nonexistent";
            UserDto updateDto = createBaseUserDto(userId).build();
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> userService.updateUser(userId, updateDto))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.USER_NOT_FOUND);
        }
    }

    @Test
    @DisplayName("비밀번호 변경 성공")
    void changePassword_success() {
        // Given
        String userId = "testUser";
        String oldPassword = "oldPassword";
        String newPassword = "newPassword";
        String encodedOldPassword = "encodedOldPassword";
        String encodedNewPassword = "encodedNewPassword";

        User user = createBaseUser(userId)
                .pswd(encodedOldPassword)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(oldPassword, encodedOldPassword)).thenReturn(true);
        when(passwordEncoder.encode(newPassword)).thenReturn(encodedNewPassword);

        // When
        userService.changePassword(userId, oldPassword, newPassword);

        // Then
        assertThat(user.getPswd()).isEqualTo(encodedNewPassword);
        verify(passwordEncoder).encode(newPassword);
    }

    @Test
    @DisplayName("비밀번호 변경 실패 - 기존 비밀번호 불일치")
    void changePassword_fail_invalidOldPassword() {
        // Given
        String userId = "testUser";
        String oldPassword = "wrongPassword";
        String newPassword = "newPassword";
        String encodedOldPassword = "encodedOldPassword";

        User user = createBaseUser(userId)
                .pswd(encodedOldPassword)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(oldPassword, encodedOldPassword)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> userService.changePassword(userId, oldPassword, newPassword))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD);
    }

    @Test
    @DisplayName("사용자 삭제 성공")
    void deleteUser_success() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            String userId = "testUser";
            User user = createBaseUser(userId).build();
            when(userRepository.findByUserId(userId)).thenReturn(Optional.of(user));

            // When
            userService.deleteUser(userId);

            // Then
            verify(userRepository).delete(user);
        }
    }

    @Test
    @DisplayName("사용자 삭제 실패 - 존재하지 않는 사용자")
    void deleteUser_fail_userNotFound() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            // Given
            String userId = "nonexistent";
            when(userRepository.existsById(userId)).thenReturn(false);

            // When & Then
            assertThatThrownBy(() -> userService.deleteUser(userId))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.USER_NOT_FOUND);
        }
    }
}
