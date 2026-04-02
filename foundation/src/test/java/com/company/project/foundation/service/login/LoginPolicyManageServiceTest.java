package com.company.project.foundation.service.login;

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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("LoginPolicyManageService ?åÏä§??)
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
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö Î™©Î°ù Ï°∞Ìöå ?±Í≥µ")
    public void testSelectLoginPolicyList_Success() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);

        User user = User.builder()
                .userId("user01")
                .esntlId("essntl01")
                .userNm("?¨Ïö©??01")
                .password("password123")
                .build();
        Page<User> userPage = new PageImpl<>(Collections.singletonList(user));

        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("user01")
                .ipInfo("127.0.0.1")
                .dplctPermAt("Y")
                .lmttAt("N")
                .build();

        // PageRequest.of(0, 10) ??Î™ÖÏãú?ÅÏúºÎ°?Î™®ÌÇπ
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findAll(eq(pageable))).thenReturn(userPage);
        when(loginPolicyRepository.findById("user01")).thenReturn(Optional.of(policy));

        // When
        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(searchVO);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("user01", result.get(0).getEmplyrId());
        assertEquals("Y", result.get(0).getRegYn());
        verify(userRepository).findAll(eq(pageable));
    }

    @Test
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö ?ÅÏÑ∏ Ï°∞Ìöå ?±Í≥µ")
    public void testSelectLoginPolicy_Success() {
        // Given
        String userId = "user01";
        User user = User.builder()
                .userId(userId)
                .esntlId("essntl01")
                .userNm("?¨Ïö©??01")
                .password("password123")
                .build();
        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId(userId)
                .ipInfo("127.0.0.1")
                .build();

        when(userRepository.findById(eq(userId))).thenReturn(Optional.of(user));
        when(loginPolicyRepository.findById(eq(userId))).thenReturn(Optional.of(policy));

        // When
        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy(userId);

        // Then
        assertNotNull(result);
        assertEquals(userId, result.getEmplyrId());
        assertEquals("Y", result.getRegYn());
    }

    @Test
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö ?±Î°ù ?±Í≥µ")
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
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö ?òÏ†ï ?±Í≥µ")
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
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö ??†ú ?±Í≥µ")
    public void testDeleteLoginPolicy() {
        // Given
        String userId = "user01";

        // When
        loginPolicyManageService.deleteLoginPolicy(userId);

        // Then
        verify(loginPolicyRepository).deleteById(userId);
    }
}
