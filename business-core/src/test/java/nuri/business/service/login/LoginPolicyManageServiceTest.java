package nuri.business.service.login;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.login.LoginPolicy;
import nuri.business.domain.login.LoginPolicyRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.login.dto.LoginPolicyDto;
import nuri.business.domain.common.BaseSearchDto;
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

        nuri.business.domain.login.LoginPolicySearchResult res1 = nuri.business.domain.login.LoginPolicySearchResult.builder()
                .userId("USER1").userNm("Name1").regYn("Y").build();
        nuri.business.domain.login.LoginPolicySearchResult res2 = nuri.business.domain.login.LoginPolicySearchResult.builder()
                .userId("USER2").userNm("Name2").regYn("N").build();
        
        given(loginPolicyRepository.searchLoginPolicies(any(), any(Pageable.class))).willReturn(new PageImpl<>(List.of(res1, res2)));

        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(searchVO);

        assertEquals(2, result.size());
        assertEquals("Y", result.get(0).getRegYn());
        assertEquals("N", result.get(1).getRegYn());
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 테스트 - 정책 있음")
    void selectLoginPolicyPresentTest() {
        User user = User.builder().userId("USER1").esntlId("USR1").userNm("Name1").pswd("pass").build();
        given(userRepository.findByUserId("USER1")).willReturn(Optional.of(user));
        
        LoginPolicy policy = LoginPolicy.builder().userId("USER1").ipAddr("127.0.0.1").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy("USER1");

        assertNotNull(result);
        assertEquals("Y", result.getRegYn());
        assertEquals("127.0.0.1", result.getIpAddr());
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 테스트 - 정책 없음")
    void selectLoginPolicyEmptyTest() {
        User user = User.builder().userId("USER1").esntlId("USR1").userNm("Name1").pswd("pass").build();
        given(userRepository.findByUserId("USER1")).willReturn(Optional.of(user));
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
        LoginPolicy policy = LoginPolicy.builder().userId("USER1").lmtYn("Y").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        BusinessException ex = assertThrows(BusinessException.class, 
            () -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_LIMITED, ex.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - IP 불일치")
    void validateLoginPolicyIpMismatchTest() {
        LoginPolicy policy = LoginPolicy.builder().userId("USER1").ipAddr("192.168.0.1").lmtYn("N").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        BusinessException ex = assertThrows(BusinessException.class, 
            () -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_IP_MISMATCH, ex.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 시간 불일치 (이전)")
    void validateLoginPolicyTimeBeforeTest() {
        LocalTime now = LocalTime.now();
        String start = now.plusHours(1).format(DateTimeFormatter.ofPattern("HH:mm"));
        String end = now.plusHours(2).format(DateTimeFormatter.ofPattern("HH:mm"));

        LoginPolicy policy = LoginPolicy.builder()
                .userId("USER1")
                .lmtYn("N")
                .bgngTm(start)
                .endTm(end)
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        BusinessException ex = assertThrows(BusinessException.class, 
            () -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 성공")
    void validateLoginPolicySuccessTest() {
        LocalTime now = LocalTime.now();
        LocalTime startTimeVal = now.getHour() == 0 ? LocalTime.MIN : now.minusHours(1);
        LocalTime endTimeVal = now.getHour() == 23 ? LocalTime.MAX : now.plusHours(1);

        String start = startTimeVal.format(DateTimeFormatter.ofPattern("HH:mm"));
        String end = endTimeVal.format(DateTimeFormatter.ofPattern("HH:mm"));

        LoginPolicy policy = LoginPolicy.builder()
                .userId("USER1")
                .lmtYn("N")
                .ipAddr("127.0.0.1")
                .bgngTm(start)
                .endTm(end)
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 수정 테스트 - 성공")
    void updateLoginPolicySuccessTest() {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setUserId("USER1");
        dto.setIpAddr("1.1.1.1");

        LoginPolicy entity = mock(LoginPolicy.class);
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(entity));

        loginPolicyManageService.updateLoginPolicy(dto);

        verify(entity).update(eq("1.1.1.1"), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("로그인 정책 등록 테스트")
    void insertLoginPolicyTest() {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setUserId("USER1");
        
        loginPolicyManageService.insertLoginPolicy(dto);
        
        verify(loginPolicyRepository).save(any(LoginPolicy.class));
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - IP 빈 문자열")
    void validateLoginPolicyIpEmptyTest() {
        LoginPolicy policy = LoginPolicy.builder().userId("USER1").ipAddr("").lmtYn("N").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - BgngTm, EndTm 빈 문자열 및 null")
    void validateLoginPolicyTimeEmptyNullTest() {
        LoginPolicy policy = LoginPolicy.builder().userId("USER1").lmtYn("N").bgngTm("").endTm("12:00").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        
        policy = LoginPolicy.builder().userId("USER1").lmtYn("N").bgngTm("12:00").endTm("").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 콜론 없는 4자리 시간 처리")
    void validateLoginPolicyTimeNoColonTest() {
        LocalTime now = LocalTime.now();
        LocalTime startTimeVal = now.getHour() == 0 ? LocalTime.MIN : now.minusHours(1);
        LocalTime endTimeVal = now.getHour() == 23 ? LocalTime.MAX : now.plusHours(1);

        String start = startTimeVal.format(DateTimeFormatter.ofPattern("HHmm"));
        String end = endTimeVal.format(DateTimeFormatter.ofPattern("HHmm"));

        LoginPolicy policy = LoginPolicy.builder()
                .userId("USER1")
                .lmtYn("N")
                .bgngTm(start)
                .endTm(end)
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }
}
