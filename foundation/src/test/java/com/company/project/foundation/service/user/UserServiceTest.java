package com.company.project.foundation.service.user;

import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("UserService 테스트")
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

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("사용자 목록 조회 테스트")
    void testGetUserList() {
        // Given
        when(userRepository.findAllWithAuthorities()).thenReturn(Collections.emptyList());

        // When
        List<UserDto> result = userService.getUserList();

        // Then
        assertNotNull(result);
        verify(userRepository, times(1)).findAllWithAuthorities();
    }

    @Test
    @DisplayName("사용자 상세 조회 테스트")
    void testGetUserById() {
        // Given
        User user = User.builder()
                .userId("user01")
                .esntlId("ESNTL_01")
                .userNm("테스트유저")
                .build();
        when(userRepository.findById("user01")).thenReturn(Optional.of(user));
        when(userAuthorityRepository.findById("ESNTL_01")).thenReturn(Optional.empty());
        when(userMapper.toDtoWithAuthority(any(), any())).thenReturn(new UserDto());

        // When
        UserDto result = userService.getUserById("user01");

        // Then
        assertNotNull(result);
        verify(userRepository, times(1)).findById("user01");
    }

    @Test
    @DisplayName("사용자 등록 테스트")
    void testRegisterUser() {
        // Given
        String userId = "newuser";
        String password = "password";
        String userNm = "신규유저";
        when(passwordEncoder.encode(anyString())).thenReturn("encoded_password");

        // When
        String result = userService.registerUser(userId, password, userNm, null, null, null);

        // Then
        assertEquals(userId, result);
        verify(userRepository, times(1)).save(any(User.class));
    }
}