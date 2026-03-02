package com.company.project.service.user;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.mapper.UserMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

/**
 * UserService 단위 테스트
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("사용자 목록 조회 성공")
    void getUserList_success() {
        // given
        User user = User.builder()
                .userId("testUser")
                .password("password")
                .userNm("테스트 사용자")
                .esntlId("USR_001")
                .role(Role.USER)
                .build();

        UserDto userDto = UserDto.builder()
                .userId("testUser")
                .userNm("테스트 사용자")
                .esntlId("USR_001")
                .role("USER")
                .build();

        given(userRepository.findAll()).willReturn(List.of(user));
        given(userMapper.toDtoWithAuthority(any(User.class), any())).willReturn(userDto);

        // when
        List<UserDto> result = userService.getUserList();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUserId()).isEqualTo("testUser");
        assertThat(result.get(0).getUserNm()).isEqualTo("테스트 사용자");
    }

    @Test
    @DisplayName("사용자 ID로 단건 조회 성공")
    void getUserById_success() {
        // given
        String userId = "testUser";
        User user = User.builder()
                .userId(userId)
                .password("password")
                .userNm("테스트 사용자")
                .esntlId("USR_001")
                .role(Role.ADMIN)
                .build();

        UserDto userDto = UserDto.builder()
                .userId(userId)
                .userNm("테스트 사용자")
                .esntlId("USR_001")
                .role("ADMIN")
                .build();

        given(userRepository.findById(userId)).willReturn(Optional.of(user));
        given(userMapper.toDtoWithAuthority(any(User.class), any())).willReturn(userDto);

        // when
        UserDto result = userService.getUserById(userId);

        // then
        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getRole()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("존재하지 않는 사용자 ID 조회 시 예외 발생")
    void getUserById_notFound() {
        // given
        String userId = "notExist";
        given(userRepository.findById(userId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> userService.getUserById(userId))
                .isInstanceOf(BusinessException.class);
    }
}
