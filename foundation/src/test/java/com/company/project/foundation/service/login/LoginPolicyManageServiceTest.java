package com.company.project.foundation.service.login;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.domain.login.LoginPolicy;
import com.company.project.foundation.domain.login.LoginPolicyRepository;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.service.login.dto.LoginPolicyDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LoginPolicyManageService 테스트")
class LoginPolicyManageServiceTest {

    @Mock
    private LoginPolicyRepository loginPolicyRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LoginPolicyManageService loginPolicyManageService;

    @Nested
    @DisplayName("로그인 정책 목록 조회 테스트")
    class SelectLoginPolicyListTests {

        @Test
        @DisplayName("로그인 정책 목록 조회 성공")
        void testSelectLoginPolicyList_Success() {
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
            assertEquals("Y", result.get(0).getRegYn());
            verify(userRepository, times(1)).findAll(any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("로그인 정책 상세 조회 테스트")
    class SelectLoginPolicyDetailTests {

        @Test
        @DisplayName("로그인 정책 상세 조회 성공")
        void testSelectLoginPolicy_Success() {
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
        @DisplayName("존재하지 않는 사용자 조회 시 예외 발생")
        void testSelectLoginPolicy_UserNotFound() {
            // Given
            when(userRepository.findById("non-exist")).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                loginPolicyManageService.selectLoginPolicy("non-exist");
            });
        }
    }

    @Nested
    @DisplayName("로그인 정책 CRUD 테스트")
    class LoginPolicyCrudTests {

        @Test
        @DisplayName("로그인 정책 등록 성공")
        void testInsertLoginPolicy() {
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
            verify(loginPolicyRepository, times(1)).save(any(LoginPolicy.class));
        }

        @Test
        @DisplayName("로그인 정책 수정 성공")
        void testUpdateLoginPolicy() {
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
        void testDeleteLoginPolicy() {
            // Given
            String userId = "user01";

            // When
            loginPolicyManageService.deleteLoginPolicy(userId);

            // Then
            verify(loginPolicyRepository, times(1)).deleteById(userId);
        }
    }
}
