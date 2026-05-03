package nuri.foundation.service.login;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.login.LoginPolicy;
import nuri.foundation.domain.login.LoginPolicyRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.login.dto.LoginPolicyDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LoginPolicyManageService 단위 테스트")
class LoginPolicyManageServiceTest {

    @Mock
    private LoginPolicyRepository loginPolicyRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LoginPolicyManageService loginPolicyManageService;

    @Test
    @DisplayName("로그인 정책 목록 조회 테스트 - 정책 있음/없음 믹스")
    void selectLoginPolicyListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);

        User user1 = User.builder().userId("USER1").esntlId("USR1").userNm("Name1").password("pass").build();
        User user2 = User.builder().userId("USER2").esntlId("USR2").userNm("Name2").password("pass").build();
        
        given(userRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(user1, user2)));
        
        LoginPolicy policy1 = LoginPolicy.builder().emplyrId("USER1").ipInfo("127.0.0.1").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy1));
        given(loginPolicyRepository.findById("USER2")).willReturn(Optional.empty());

        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(searchVO);

        assertEquals(2, result.size());
        assertEquals("Y", result.get(0).getRegYn());
        assertEquals("N", result.get(1).getRegYn());
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 테스트 - 정책 있음")
    void selectLoginPolicyPresentTest() {
        User user = User.builder().userId("USER1").esntlId("USR1").userNm("Name1").password("pass").build();
        given(userRepository.findById("USER1")).willReturn(Optional.of(user));
        
        LoginPolicy policy = LoginPolicy.builder().emplyrId("USER1").ipInfo("127.0.0.1").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy("USER1");

        assertNotNull(result);
        assertEquals("Y", result.getRegYn());
        assertEquals("127.0.0.1", result.getIpInfo());
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 테스트 - 정책 없음")
    void selectLoginPolicyEmptyTest() {
        User user = User.builder().userId("USER1").esntlId("USR1").userNm("Name1").password("pass").build();
        given(userRepository.findById("USER1")).willReturn(Optional.of(user));
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.empty());

        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy("USER1");

        assertNotNull(result);
        assertEquals("N", result.getRegYn());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 정책 없음")
    void validateLoginPolicyNoPolicyTest() {
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.empty());
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 제한 여부 Y")
    void validateLoginPolicyLimitedTest() {
        LoginPolicy policy = LoginPolicy.builder().emplyrId("USER1").lmttAt("Y").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        BusinessException ex = assertThrows(BusinessException.class, 
            () -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        assertEquals(ErrorCode.LOGIN_POLICY_LIMITED, ex.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - IP 불일치")
    void validateLoginPolicyIpMismatchTest() {
        LoginPolicy policy = LoginPolicy.builder().emplyrId("USER1").ipInfo("192.168.0.1").lmttAt("N").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        BusinessException ex = assertThrows(BusinessException.class, 
            () -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        assertEquals(ErrorCode.LOGIN_POLICY_IP_MISMATCH, ex.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 시간 불일치 (이전)")
    void validateLoginPolicyTimeBeforeTest() {
        LocalTime now = LocalTime.now();
        String start = now.plusHours(1).format(DateTimeFormatter.ofPattern("HH:mm"));
        String end = now.plusHours(2).format(DateTimeFormatter.ofPattern("HH:mm"));

        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("USER1")
                .lmttAt("N")
                .startTime(start)
                .endTime(end)
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        BusinessException ex = assertThrows(BusinessException.class, 
            () -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        assertEquals(ErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 성공")
    void validateLoginPolicySuccessTest() {
        LocalTime now = LocalTime.now();
        String start = now.minusHours(1).format(DateTimeFormatter.ofPattern("HH:mm"));
        String end = now.plusHours(1).format(DateTimeFormatter.ofPattern("HH:mm"));

        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("USER1")
                .lmttAt("N")
                .ipInfo("127.0.0.1")
                .startTime(start)
                .endTime(end)
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 수정 테스트 - 성공")
    void updateLoginPolicySuccessTest() {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setEmplyrId("USER1");
        dto.setIpInfo("1.1.1.1");

        LoginPolicy entity = mock(LoginPolicy.class);
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(entity));

        loginPolicyManageService.updateLoginPolicy(dto);

        verify(entity).update(eq("1.1.1.1"), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("로그인 정책 등록 테스트")
    void insertLoginPolicyTest() {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setEmplyrId("USER1");
        
        loginPolicyManageService.insertLoginPolicy(dto);
        
        verify(loginPolicyRepository).save(any(LoginPolicy.class));
    }
}
