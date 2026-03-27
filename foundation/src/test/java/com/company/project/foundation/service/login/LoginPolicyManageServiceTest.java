package com.company.project.foundation.service.login;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.domain.login.LoginPolicy;
import com.company.project.foundation.domain.login.LoginPolicyRepository;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.service.login.dto.LoginPolicyDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("LoginPolicyManageService 테스트")
public class LoginPolicyManageServiceTest {

    @Mock
    private LoginPolicyRepository loginPolicyRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LoginPolicyManageService loginPolicyManageService;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("로그인 정책 목록 조회 성공")
    public void testSelectLoginPolicyList_Success() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);

        User user = User.builder().userId("user01").userNm("사용자01").build();
        Page<User> userPage = new PageImpl<>(Collections.singletonList(user));

        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("user01")
                .ipInfo("127.0.0.1")
                .dplctPermAt("Y")
                .lmttAt("N")
                .build();

        when(userRepository.findAll(any(Pageable.class))).thenReturn(userPage);
        when(loginPolicyRepository.findById("user01")).thenReturn(Optional.of(policy));

        // When
        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(searchVO);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("user01", result.get(0).getEmplyrId());
        verify(userRepository).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 성공")
    public void testSelectLoginPolicy_Success() {
        // Given
        String userId = "user01";
        User user = User.builder().userId(userId).userNm("사용자01").build();
        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId(userId)
                .ipInfo("127.0.0.1")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(loginPolicyRepository.findById(userId)).thenReturn(Optional.of(policy));

        // When
        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy(userId);

        // Then
        assertNotNull(result);
        assertEquals(userId, result.getEmplyrId());
        assertEquals("Y", result.getRegYn());
    }

    @Test
    @DisplayName("로그인 정책 등록 성공")
    public void testInsertLoginPolicy() {
        // Given
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .emplyrId("user01")
                .ipInfo("127.0.0.1")
                .dplctPermAt("Y")
                .lmttAt("N")
                .build();

        // When
        loginPolicyManageService.insertLoginPolicy(dto);

        // Then
        verify(loginPolicyRepository).save(any(LoginPolicy.class));
    }

    @Test
    @DisplayName("로그인 정책 수정 성공")
    public void testUpdateLoginPolicy() {
        // Given
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .emplyrId("user01")
                .ipInfo("192.168.0.1")
                .build();

        LoginPolicy existing = LoginPolicy.builder()
                .emplyrId("user01")
                .ipInfo("127.0.0.1")
                .build();

        when(loginPolicyRepository.findById("user01")).thenReturn(Optional.of(existing));

        // When
        loginPolicyManageService.updateLoginPolicy(dto);

        // Then
        assertEquals("192.168.0.1", existing.getIpInfo());
    }

    @Test
    @DisplayName("로그인 정책 삭제 성공")
    public void testDeleteLoginPolicy() {
        // Given
        String userId = "user01";

        // When
        loginPolicyManageService.deleteLoginPolicy(userId);

        // Then
        verify(loginPolicyRepository).deleteById(userId);
    }
}
