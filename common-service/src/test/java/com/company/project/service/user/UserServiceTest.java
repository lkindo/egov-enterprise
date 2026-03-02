package com.company.project.service.user;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserAuthorityRepository userAuthorityRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private UserMapper userMapper;

    private UserService userService;

    @BeforeEach
    void setUp() {
        // Constructor arguments ordered correctly
        userService = new UserService(
            userRepository,
            userAuthorityRepository,
            passwordEncoder,
            userMapper
        );
    }

    @Test
    @DisplayName("사용자 상세 조회 성공 테스트")
    void getUserDetailSuccessTest() {
        // Given
        User user = User.builder().userId("user01").userNm("Name").esntlId("KEY01").build();
        given(userRepository.findById("user01")).willReturn(Optional.of(user));

        // When
        UserDto result = userService.getUserById("user01");

        // Then
        assertThat(result.getUserId()).isEqualTo("user01");
        assertThat(result.getUserNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("존재하지 않는 사용자 조회 시 예외 발생 테스트")
    void getUserDetailFailTest() {
        // Given
        given(userRepository.findById(anyString())).willReturn(Optional.empty());

        // When & Then
        assertThrows(BusinessException.class, () -> userService.getUserById("unknown"));
    }
}
