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
    private nuri.business.domain.auth.RefreshTokenRepository refreshTokenRepository;

    @Mock
    private nuri.business.domain.login.LoginPolicyRepository loginPolicyRepository;

    @Mock
    private nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository;

    @Mock
    private nuri.business.domain.system.content.community.CommunityUserRepository communityUserRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, userAuthorityRepository, refreshTokenRepository,
                loginPolicyRepository, userAbsenceRepository, communityUserRepository,
                passwordEncoder, eventPublisher);
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
    @DisplayName("사용자 삭제 성공 - 종속 데이터(권한매핑·토큰) 정리 후 이벤트 발행과 함께 삭제 (V2_12 FK 결속)")
    void deleteUser_success() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            String userId = "testUser";
            User user = createBaseUser(userId).build();
            when(userRepository.findByUserId(userId)).thenReturn(Optional.of(user));

            // When
            userService.deleteUser(userId);

            // Then — FK(NO ACTION)를 통과하려면 종속 정리가 삭제 전에 모두 수행되어야 한다
            verify(userAuthorityRepository).deleteAllByIdInBatch(java.util.List.of("ESNTL_" + userId));
            // [P2 키 규약] rfsh_tk 는 esntlId 단일 키잉 — loginId 이중 삭제는 제거됨
            verify(refreshTokenRepository).deleteByUserId("ESNTL_" + userId);
            verify(refreshTokenRepository, never()).deleteByUserId(userId);
            var eventCaptor = org.mockito.ArgumentCaptor
                    .forClass(nuri.business.service.user.event.UserDeletionEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            assertThat(eventCaptor.getValue().esntlIds()).containsExactly("ESNTL_" + userId);
            verify(userRepository).deleteAllInBatch(java.util.List.of(user));
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

    @Test
    @DisplayName("사용자 삭제 금지 - 시스템 관리자(webmaster)는 콘텐츠 재귀속 종착 계정이므로 삭제 불가")
    void deleteUser_fail_systemAdminProtected() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User webmaster = User.builder()
                    .userId("webmaster")
                    .esntlId(nuri.foundation.constants.Constants.User.SYSTEM_ADMIN_ESNTL_ID)
                    .userNm("최고관리자")
                    .pswd("password")
                    .build();
            when(userRepository.findByUserId("webmaster")).thenReturn(Optional.of(webmaster));

            assertThatThrownBy(() -> userService.deleteUser("webmaster"))
                    .isInstanceOf(BusinessException.class);
            verify(userRepository, never()).deleteAllInBatch(anyList());
            verify(userAuthorityRepository, never()).deleteAllByIdInBatch(anyList());
        }
    }

    @Test
    @DisplayName("사용자 일괄 삭제 - loginId 목록을 esntlId 로 해석해 실제 삭제 (기존 침묵 no-op 버그 회귀 방지)")
    void deleteUserList_resolvesLoginIdsToEsntlIds() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User userA = createBaseUser("loginA").build();
            User userB = createBaseUser("loginB").build();
            when(userRepository.findByUserId("loginA")).thenReturn(Optional.of(userA));
            when(userRepository.findByUserId("loginB")).thenReturn(Optional.of(userB));

            // When — FE(UserOrgHubClient)는 loginId 목록을 보낸다
            userService.deleteUserList(java.util.List.of("loginA", "loginB"));

            // Then — PK(esntlId)로 확정된 실제 사용자들이 삭제되어야 한다
            verify(userAuthorityRepository).deleteAllByIdInBatch(java.util.List.of("ESNTL_loginA", "ESNTL_loginB"));
            verify(userRepository).deleteAllInBatch(java.util.List.of(userA, userB));
            verify(eventPublisher).publishEvent(any(nuri.business.service.user.event.UserDeletionEvent.class));
        }
    }

    @Test
    @DisplayName("사용자 일괄 삭제 - 존재하지 않는 ID 는 멱등 의미론으로 건너뜀")
    void deleteUserList_skipsMissingIds() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User userA = createBaseUser("loginA").build();
            when(userRepository.findByUserId("loginA")).thenReturn(Optional.of(userA));
            when(userRepository.findByUserId("ghost")).thenReturn(Optional.empty());
            when(userRepository.findById("ghost")).thenReturn(Optional.empty());

            userService.deleteUserList(java.util.List.of("loginA", "ghost"));

            verify(userRepository).deleteAllInBatch(java.util.List.of(userA));
        }
    }
}
