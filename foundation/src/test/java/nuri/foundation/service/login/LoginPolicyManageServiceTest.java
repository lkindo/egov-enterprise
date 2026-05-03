package nuri.foundation.service.login;

import nuri.foundation.domain.login.LoginPolicy;
import nuri.foundation.domain.login.LoginPolicyRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.login.dto.LoginPolicyDto;
import nuri.foundation.domain.common.BaseSearchDto;
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
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("LoginPolicyManageService (로그인 정책 관리) 테스트")
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
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);

        User user = User.builder()
                .userId("user01")
                .esntlId("essntl01")
                .userNm("사용자01")
                .password("password123")
                .build();
        Page<User> userPage = new PageImpl<>(Collections.singletonList(user));

        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("user01")
                .ipInfo("127.0.0.1")
                .dplctPermAt("Y")
                .lmttAt("N")
                .build();

        // PageRequest.of(0, 10) 을 명시적으로 모킹
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
    @DisplayName("로그인 정책 상세 조회 성공")
    public void testSelectLoginPolicy_Success() {
        // Given
        String userId = "user01";
        User user = User.builder()
                .userId(userId)
                .esntlId("essntl01")
                .userNm("사용자01")
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
    @DisplayName("로그인 정책 목록 조회 - 페이지 단위가 0 이하일 때 기본값 10 사용")
    public void testSelectLoginPolicyList_DefaultPageUnit() {
        // Given
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(0);

        User user = User.builder()
                .userId("user01")
                .userNm("사용자01")
                .esntlId("essntl01")
                .password("password123")
                .build();
        Page<User> userPage = new PageImpl<>(Collections.singletonList(user));

        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findAll(eq(pageable))).thenReturn(userPage);
        when(loginPolicyRepository.findById("user01")).thenReturn(Optional.empty());

        // When
        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(searchVO);

        // Then
        assertEquals(10, pageable.getPageSize());
        assertEquals("N", result.get(0).getRegYn());
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 - 사용자 없음")
    public void testSelectLoginPolicy_UserNotFound() {
        // Given
        String userId = "nonexistent";
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> 
            loginPolicyManageService.selectLoginPolicy(userId)
        );
        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 - 정책 정보 없음")
    public void testSelectLoginPolicy_PolicyNotFound() {
        // Given
        String userId = "user01";
        User user = User.builder().userId(userId).userNm("사용자01").esntlId("essntl01").password("password123").build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(loginPolicyRepository.findById(userId)).thenReturn(Optional.empty());

        // When
        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy(userId);

        // Then
        assertEquals("N", result.getRegYn());
        assertNull(result.getIpInfo());
    }

    @Test
    @DisplayName("로그인 정책 수정 - 엔티티 없음")
    public void testUpdateLoginPolicy_EntityNotFound() {
        // Given
        LoginPolicyDto dto = LoginPolicyDto.builder().emplyrId("nonexistent").build();
        when(loginPolicyRepository.findById("nonexistent")).thenReturn(Optional.empty());

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> 
            loginPolicyManageService.updateLoginPolicy(dto)
        );
        assertEquals(ErrorCode.ENTITY_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 정책 없음 (성공)")
    public void testValidateLoginPolicy_NoPolicy() {
        // Given
        String userId = "user01";
        when(loginPolicyRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy(userId, "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 계정 제한됨")
    public void testValidateLoginPolicy_Limited() {
        // Given
        String userId = "user01";
        LoginPolicy policy = LoginPolicy.builder().emplyrId(userId).lmttAt("Y").build();
        when(loginPolicyRepository.findById(userId)).thenReturn(Optional.of(policy));

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> 
            loginPolicyManageService.validateLoginPolicy(userId, "127.0.0.1")
        );
        assertEquals(ErrorCode.LOGIN_POLICY_LIMITED, exception.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - IP 불일치")
    public void testValidateLoginPolicy_IpMismatch() {
        // Given
        String userId = "user01";
        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId(userId)
                .lmttAt("N")
                .ipInfo("192.168.0.1")
                .build();
        when(loginPolicyRepository.findById(userId)).thenReturn(Optional.of(policy));

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> 
            loginPolicyManageService.validateLoginPolicy(userId, "127.0.0.1")
        );
        assertEquals(ErrorCode.LOGIN_POLICY_IP_MISMATCH, exception.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 시간 제한 (현재 시간 이전)")
    public void testValidateLoginPolicy_TimeRestricted_Before() {
        // Given
        String userId = "user01";
        // 현재 시간보다 이후로 설정하여 제한 걸리게 함 (HH:mm 포맷)
        LocalTime future = LocalTime.now().plusHours(1);
        LocalTime farFuture = LocalTime.now().plusHours(2);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        
        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId(userId)
                .lmttAt("N")
                .startTime(future.format(formatter))
                .endTime(farFuture.format(formatter))
                .build();
        when(loginPolicyRepository.findById(userId)).thenReturn(Optional.of(policy));

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> 
            loginPolicyManageService.validateLoginPolicy(userId, "127.0.0.1")
        );
        assertEquals(ErrorCode.LOGIN_POLICY_TIME_RESTRICTED, exception.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 성공")
    public void testValidateLoginPolicy_Success() {
        // Given
        String userId = "user01";
        LocalTime past = LocalTime.now().minusHours(1);
        LocalTime future = LocalTime.now().plusHours(1);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId(userId)
                .lmttAt("N")
                .ipInfo("127.0.0.1")
                .startTime(past.format(formatter))
                .endTime(future.format(formatter))
                .build();
        when(loginPolicyRepository.findById(userId)).thenReturn(Optional.of(policy));

        // When & Then
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy(userId, "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 목록 총 갯수 조회")
    public void testSelectLoginPolicyListTotCnt() {
        // Given
        when(userRepository.count()).thenReturn(5L);

        // When
        int result = loginPolicyManageService.selectLoginPolicyListTotCnt(new BaseSearchDto());

        // Then
        assertEquals(5, result);
    }
}
