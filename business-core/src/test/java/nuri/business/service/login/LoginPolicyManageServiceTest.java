package nuri.business.service.login;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
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
import org.springframework.data.domain.PageRequest;

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
    @DisplayName("로그인 정책 IP 비교 - IPv6 확장·압축·대소문자 표기는 같은 주소로 본다")
    void validateLoginPolicyTreatsEquivalentIpv6FormsAsEqual() {
        LoginPolicy expandedUppercase = LoginPolicy.builder()
                .userId("USER1")
                .ipAddr("2001:0DB8:0000:0000:0000:0000:0000:0001")
                .lmtYn("N")
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(expandedUppercase));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "2001:db8::1"));

        LoginPolicy compressedLowercase = LoginPolicy.builder()
                .userId("USER1")
                .ipAddr("2001:db8::1")
                .lmtYn("N")
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(compressedLowercase));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy(
                "USER1", "2001:0DB8:0000:0000:0000:0000:0000:0001"));
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 시간 불일치 (이전)")
    void validateLoginPolicyTimeBeforeTest() {
        // [2026-09-13] 판정 시계를 고정한다. 종전의 "현재 시각(Asia/Seoul) 기준 상대 창" 은 UTC 러너
        //   9시간 어긋남(2026-07-26 CI 실패)을 피하려던 우회였고, 시계 주입으로 그 원인 자체가 사라졌다.
        fixClockAt(12, 0);
        LoginPolicy policy = LoginPolicy.builder()
                .userId("USER1")
                .lmtYn("N")
                .bgngTm("13:00")
                .endTm("14:00")
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        BusinessException ex = assertThrows(BusinessException.class, 
            () -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
    }

    @Test
    @DisplayName("로그인 정책 유효성 검증 - 성공")
    void validateLoginPolicySuccessTest() {
        // [2026-09-13] 판정 시계를 고정한다. 종전의 상대 창은 UTC 러너 9시간 어긋남(2026-07-26)과
        //   "HH:mm" 절단으로 KST 23:59 한 분 동안만 실패하던 플레이크(2026-08-09)를 차례로 겪었다 —
        //   둘 다 테스트가 실제 시계를 읽었기 때문이며, 시계 주입으로 원인 자체가 사라졌다.
        fixClockAt(12, 0);
        LoginPolicy policy = LoginPolicy.builder()
                .userId("USER1")
                .lmtYn("N")
                .ipAddr("127.0.0.1")
                .bgngTm("11:00")
                .endTm("13:00")
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }

    @Test
    @DisplayName("로그인 정책 수정 테스트 - 성공")
    void updateLoginPolicySuccessTest() {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setUserId("USER1");
        dto.setIpAddr("2001:0DB8:0000:0000:0000:0000:0000:0001");

        LoginPolicy entity = mock(LoginPolicy.class);
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(entity));

        loginPolicyManageService.updateLoginPolicy(dto);

        verify(entity).update(eq("2001:db8::1"), any(), any(), any(), any(), any());
    }

    /*
      GAP-POLICY-001 — 화면 폼은 다섯 필드만 보내는데(loginPolicySchema 의 .pick) 엔티티 update 는
      전체 치환이라, 중복 로그인 허용 여부가 저장할 때마다 null 로 덮어써졌다. CHECK 제약은
      PostgreSQL 규칙상 NULL 을 통과시켜 아무것도 실패하지 않았다.

      두 방향을 함께 고정한다 — 유지 분기가 과해서 "명시해도 안 바뀐다" 가 되면 그것도 결함이다.
    */
    @Test
    @DisplayName("수정: 중복 허용 여부가 요청에 없으면 기존 값을 유지한다")
    void updateKeepsDuplicateFlagWhenRequestOmitsIt() {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setUserId("USER1");
        dto.setIpAddr("192.168.0.1");
        dto.setLmtYn("N");
        // dpcnPrmYn 은 설정하지 않는다 — 화면이 보내지 않는 그대로다.

        LoginPolicy entity = LoginPolicy.builder()
                .userId("USER1").ipAddr("10.0.0.1").dpcnPrmYn("Y").lmtYn("Y")
                .bgngTm("0900").endTm("1800").otpUseYn("N").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(entity));

        loginPolicyManageService.updateLoginPolicy(dto);

        // ⚠ 이 단언이 red 가 되면 관리자가 IP 하나를 고칠 때마다 중복 로그인 설정이 사라진다.
        assertEquals("Y", entity.getDpcnPrmYn());
        // 보낸 필드는 정상 반영된다 — 유지 분기가 다른 필드까지 얼리지 않는다.
        assertEquals("192.168.0.1", entity.getIpAddr());
        assertEquals("N", entity.getLmtYn());
    }

    @Test
    @DisplayName("수정: 중복 허용 여부를 명시하면 그 값으로 바뀐다")
    void updateAppliesDuplicateFlagWhenRequestSpecifiesIt() {
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setUserId("USER1");
        dto.setIpAddr("192.168.0.1");
        dto.setDpcnPrmYn("N");

        LoginPolicy entity = LoginPolicy.builder()
                .userId("USER1").ipAddr("10.0.0.1").dpcnPrmYn("Y").build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(entity));

        loginPolicyManageService.updateLoginPolicy(dto);

        // 과잉 교정("항상 기존 값을 쓴다")을 막는 대조군이다.
        assertEquals("N", entity.getDpcnPrmYn());
    }

    @Test
    @DisplayName("로그인 정책 등록 테스트")
    void insertLoginPolicyTest() {
        // [V2_13] 등록 전 실존 사용자 검증이 추가됨 (fk_tb_login_policy_tb_user_info 선차단)
        User user = User.builder().userId("USER1").esntlId("USR1").userNm("Name1").pswd("pass").build();
        given(userRepository.findByUserId("USER1")).willReturn(Optional.of(user));
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setUserId("USER1");

        loginPolicyManageService.insertLoginPolicy(dto);

        verify(loginPolicyRepository).save(any(LoginPolicy.class));
    }

    @Test
    @DisplayName("로그인 정책 등록 실패 - 존재하지 않는 사용자 (유령 loginId 차단, V2_13 결속)")
    void insertLoginPolicyUserNotFoundTest() {
        given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());
        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setUserId("ghost");

        org.junit.jupiter.api.Assertions.assertThrows(nuri.foundation.core.exception.BusinessException.class,
                () -> loginPolicyManageService.insertLoginPolicy(dto));
        verify(loginPolicyRepository, org.mockito.Mockito.never()).save(any(LoginPolicy.class));
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
        // [2026-09-13] 판정 시계 고정 — validateLoginPolicySuccessTest 와 같은 이유.
        fixClockAt(12, 0);
        LoginPolicy policy = LoginPolicy.builder()
                .userId("USER1")
                .lmtYn("N")
                .bgngTm("1100")
                .endTm("1300")
                .build();
        given(loginPolicyRepository.findById("USER1")).willReturn(Optional.of(policy));
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("USER1", "127.0.0.1"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] LoginPolicyManageService 에서 20개가 살아남았다.
    //   그중 6개가 **로그인 시간 제한 창** 판정이다.
    //
    //   이 분기가 뒤집히면 **제한 시간에 로그인이 허용되거나, 정상 시간에 차단**된다.
    //   자정을 넘는 창(예: 22:00~06:00)은 start > end 라 판정식이 반대가 되는데,
    //   그 갈림길이 검증된 적이 없었다.
    //
    //   [2026-09-13] 종전에는 서비스가 LocalTime.now(Asia/Seoul) 를 직접 불러 고정 시각을 넣을 수 없었고,
    //   현재 시각 기준 상대 창 + assumeTrue(자정 부근·저녁 skip)로 우회했다. 그래서 필수 mutation 게이트가
    //   죽이는 뮤턴트가 CI 실행 시각에 따라 달라졌다. 이제 서비스의 판정 시계를 고정해 **어느 시각에 돌려도
    //   같은 판정**을 검증한다. 기준 시각은 KST 12:00 이며, 경계(정확히 시작·끝 시각)도 함께 고정한다.
    // ─────────────────────────────────────────────────────────────────────────

    private static final java.time.ZoneId SEOUL = java.time.ZoneId.of("Asia/Seoul");

    /** 서비스의 판정 시계를 KST 기준 특정 시각으로 고정한다. */
    private void fixClockAt(int hour, int minute) {
        loginPolicyManageService.useClock(java.time.Clock.fixed(
                java.time.LocalDate.of(2026, 9, 13).atTime(hour, minute).atZone(SEOUL).toInstant(), SEOUL));
    }

    private LoginPolicy policyWithWindow(String bgng, String end) {
        return LoginPolicy.builder().userId("U1").lmtYn("N").bgngTm(bgng).endTm(end).build();
    }

    @Test
    @DisplayName("시간창: 현재가 창 안이면 통과한다 (정상 순서 창)")
    void timeWindow_insideNormalWindow_passes() {
        fixClockAt(12, 0);
        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow("10:00", "14:00")));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간창: 현재가 창 밖이면 차단한다 (정상 순서 창)")
    void timeWindow_outsideNormalWindow_blocks() {
        fixClockAt(12, 0);
        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow("08:00", "09:00")));

        // 조건을 뒤집은 뮤턴트는 통과시켜 여기서 죽는다.
        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
        assertTrue(ex.getMessage().contains("제한된 접속 시간"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
    }

    @Test
    @DisplayName("시간창: 시작·끝 시각과 정확히 같은 순간은 창 안이다 (양끝 포함)")
    void timeWindow_boundariesAreInclusive() {
        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow("10:00", "14:00")));

        // `!now.isBefore(start)` / `!now.isAfter(end)` 의 경계 뮤턴트(isBefore↔isAfter, 부정 제거)가 여기서 죽는다.
        fixClockAt(10, 0);
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
        fixClockAt(14, 0);
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));

        fixClockAt(9, 59);
        assertThrows(BusinessException.class, () -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
        fixClockAt(14, 1);
        assertThrows(BusinessException.class, () -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간창: 자정을 넘는 창(start > end)도 현재가 안이면 통과한다")
    void timeWindow_insideOvernightWindow_passes() {
        fixClockAt(12, 0);
        // 13:00~12:30 은 start > end 인 '자정 넘는 창' 이고, 12:00 은 [00:00, 12:30] 구간에 든다.
        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow("13:00", "12:30")));

        // startTime.isBefore(endTime) 분기 선택이 틀리면 여기서 차단되어 죽는다.
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간창: 자정을 넘는 창의 바깥(end 와 start 사이)은 차단한다")
    void timeWindow_outsideOvernightWindow_blocks() {
        fixClockAt(12, 0);
        // 22:00~06:00 창에서 12:00 은 두 구간 모두 밖이다. 이 케이스는 OR↔AND 나 분기 선택 뮤턴트와는
        // 결과가 같아 그것들을 죽이지 못한다(그 몫은 자정 넘김 '안' 테스트들이다). 여기서 죽는 것은
        // 자정 넘김 창에서 차단 자체를 없애는 뮤턴트(`!withinWindow` 부정·throw 제거)다.
        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow("22:00", "06:00")));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
    }

    @Test
    @DisplayName("시간창: HHmm(콜론 없음) 형식도 파싱한다")
    void timeWindow_acceptsCompactFormat() {
        fixClockAt(12, 0);
        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow("1000", "1400")));

        // `!bgng.contains(":") && length >= 4` 조건을 뒤집으면 파싱이 깨져 catch 로 빠진다.
        // 2026-08-09 fail-closed 전환 이후 catch 는 형식 오류로 **차단**하므로, 허용이어야 할 이 케이스가
        // 예외를 던져 변환 분기 뮤턴트가 여기서 죽는다.
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간창 미설정이면 시간 검사를 건너뛴다")
    void timeWindow_absentSkipsCheck() {
        given(loginPolicyRepository.findById("U1"))
                .willReturn(Optional.of(policyWithWindow(null, null)));
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));

        given(loginPolicyRepository.findById("U2"))
                .willReturn(Optional.of(LoginPolicy.builder().userId("U2").lmtYn("N").bgngTm("").endTm("").build()));
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U2", "127.0.0.1"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] PIT 이 이 클래스에서 19개를 살려 보냈다.
    //
    //   가장 위험한 것은 validateLoginPolicy 의 **시간 형식 변환 분기**(L118·L121)다.
    //   기존 테스트는 전부 "HH:mm" 형식을 넣어서, "HHmm"(콜론 없음) 을 받아
    //   "HH:mm" 으로 재조립하는 분기에 **닿은 적이 없었다**.
    //   그 분기를 뒤집으면 parse 가 실패하고 → 당시의 `catch (Exception)` 이 삼켜서
    //   → **접속 시간 제한이 통째로 무력화된 채 로그인이 성공했다**(같은 날 fail-closed 로 전환).
    //   지금은 catch 가 같은 에러 코드(LOGIN_POLICY_TIME_RESTRICTED)의 **형식 오류 메시지**로 차단하므로,
    //   차단 테스트는 코드만이 아니라 메시지로 '정상 시간 제한' 과 '형식 오류' 를 구분해야 뮤턴트를 죽인다.
    // ─────────────────────────────────────────────────────────────────────────

    /** 콜론 없는 "HHmm" 형식의 시간창 정책을 만든다. */
    private static LoginPolicy policyWithCompactTimeWindow(LocalTime start, LocalTime end) {
        DateTimeFormatter compact = DateTimeFormatter.ofPattern("HHmm");
        return LoginPolicy.create("tester", null, "Y", "N",
                start.format(compact), end.format(compact), "N");
    }

    @Test
    @DisplayName("시간정책: 'HHmm'(콜론 없음) 형식도 해석해 제한 시간을 실제로 차단한다")
    void compactTimeFormatIsParsedAndEnforced() {
        // 12:00 을 확실히 벗어난 창 [14:00, 16:00]. 종전에는 상대 창이라 KST 19시 이후 skip 됐다.
        fixClockAt(12, 0);
        LoginPolicy policy = policyWithCompactTimeWindow(LocalTime.of(14, 0), LocalTime.of(16, 0));
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(policy));

        // 변환 분기(!contains(":") / length >= 4)를 뒤집은 뮤턴트는 parse 실패 → catch 가 형식 오류로 차단한다.
        // 에러 코드는 같으므로, 정상적인 '시간 밖' 차단임을 메시지로 확인해야 이 테스트가 그 뮤턴트를 죽인다.
        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("제한된 접속 시간"), ex.getMessage());
    }

    @Test
    @DisplayName("시간정책: 'HHmm' 형식이 허용 창일 때는 통과한다 (변환이 양방향으로 옳다)")
    void compactTimeFormatAllowsWithinWindow() {
        fixClockAt(12, 0);
        LoginPolicy policy = policyWithCompactTimeWindow(LocalTime.of(11, 0), LocalTime.of(13, 0));
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(policy));

        // 통과가 '검증이 없어서'가 아니라 '창 안이라서'임을 확인한다.
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
    }


    // ── 조회/DTO 매핑 ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("목록 총건수는 저장소의 totalElements 를 그대로 돌려준다")
    void totalCountReflectsRepositoryTotal() {
        BaseSearchDto vo = new BaseSearchDto();
        given(loginPolicyRepository.searchLoginPolicies(any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 42));

        // `replaced int return with 0` 뮤턴트가 여기서 죽는다 — 0 은 "정책 없음" 으로 오독된다.
        assertEquals(42, loginPolicyManageService.selectLoginPolicyListTotCnt(vo));
    }

    @Test
    @DisplayName("단건 조회: 정책이 없으면 regYn='N' 이고 정책 필드는 비어 있다")
    void selectLoginPolicyWithoutPolicyReturnsUnregistered() {
        User user = User.builder().esntlId("ESNTL01").userId("tester").userNm("테스터").build();
        given(userRepository.findByUserId("tester")).willReturn(Optional.of(user));
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.empty());

        LoginPolicyDto dto = loginPolicyManageService.selectLoginPolicy("tester");

        assertNotNull(dto);
        // 키는 loginId 여야 한다 — esntlId 를 돌려주면 클라이언트가 그 값으로 재기록해 정책이 무력화된다.
        assertEquals("tester", dto.getUserId());
        assertEquals("테스터", dto.getUserNm());
        assertEquals("N", dto.getRegYn());
        assertNull(dto.getIpAddr());
        assertNull(dto.getOtpUseYn());
    }

    @Test
    @DisplayName("단건 조회: 정책이 있으면 6개 필드가 모두 DTO 로 옮겨지고 regYn='Y' 가 된다")
    void selectLoginPolicyCopiesEveryPolicyField() {
        User user = User.builder().esntlId("ESNTL01").userId("tester").userNm("테스터").build();
        given(userRepository.findByUserId("tester")).willReturn(Optional.of(user));
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(
                LoginPolicy.create("tester", "10.0.0.1", "Y", "N", "0900", "1800", "Y")));

        LoginPolicyDto dto = loginPolicyManageService.selectLoginPolicy("tester");

        // setter 6종을 각각 지운 뮤턴트가 여기서 하나씩 죽는다.
        // 한 필드라도 누락되면 관리 화면이 **빈 값을 저장해 정책을 지운다**.
        assertEquals("10.0.0.1", dto.getIpAddr());
        assertEquals("Y", dto.getDpcnPrmYn());
        assertEquals("N", dto.getLmtYn());
        assertEquals("0900", dto.getBgngTm());
        assertEquals("1800", dto.getEndTm());
        assertEquals("Y", dto.getOtpUseYn());
        assertEquals("Y", dto.getRegYn());
    }

    @Test
    @DisplayName("단건 조회: 사용자가 없으면 USER_NOT_FOUND 로 끝난다")
    void selectLoginPolicyThrowsWhenUserMissing() {
        given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

        // orElseThrow 람다의 `replaced return value with null` 뮤턴트가 여기서 죽는다.
        assertThrows(BusinessException.class, () -> loginPolicyManageService.selectLoginPolicy("ghost"));
    }

    // ── 쓰기 경로 ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("등록: 최초등록자를 SYSTEM 으로 남기고 저장한다")
    void insertStampsSystemRegistrar() {
        User user = User.builder().esntlId("ESNTL01").userId("tester").userNm("테스터").build();
        given(userRepository.findByUserId("tester")).willReturn(Optional.of(user));
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .userId("tester").ipAddr("2001:0DB8:0000:0000:0000:0000:0000:0001")
                .dpcnPrmYn("Y").lmtYn("N")
                .bgngTm("0900").endTm("1800").otpUseYn("Y").build();

        loginPolicyManageService.insertLoginPolicy(dto);

        org.mockito.ArgumentCaptor<LoginPolicy> saved =
                org.mockito.ArgumentCaptor.forClass(LoginPolicy.class);
        verify(loginPolicyRepository).save(saved.capture());
        // `removed call to setFrstRgtrId` 뮤턴트가 여기서 죽는다(감사 컬럼 NOT NULL 위반 경로).
        assertEquals("SYSTEM", saved.getValue().getFrstRgtrId());
        assertEquals("tester", saved.getValue().getUserId());
        assertEquals("2001:db8::1", saved.getValue().getIpAddr());
        assertEquals("Y", saved.getValue().getOtpUseYn());
    }

    @Test
    @DisplayName("등록: 유효한 IP 리터럴이 아닌 값은 C001/400으로 거부한다")
    void insertRejectsInvalidIpAddress() {
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .userId("tester")
                .ipAddr("attacker.example")
                .build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.insertLoginPolicy(dto));

        assertEquals(CommonErrorCode.INVALID_INPUT_VALUE, ex.getErrorCode());
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, ex.getErrorCode().getStatus());
        verifyNoInteractions(userRepository, loginPolicyRepository);
    }

    @Test
    @DisplayName("수정: 잘못된 IPv6 리터럴은 C001/400으로 거부한다")
    void updateRejectsInvalidIpAddress() {
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .userId("tester")
                .ipAddr("2001:db8::zz")
                .build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.updateLoginPolicy(dto));

        assertEquals(CommonErrorCode.INVALID_INPUT_VALUE, ex.getErrorCode());
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, ex.getErrorCode().getStatus());
        verifyNoInteractions(loginPolicyRepository);
    }

    @Test
    @DisplayName("등록: 존재하지 않는 로그인 ID 는 거부한다 (유령 정책 차단)")
    void insertRejectsUnknownLoginId() {
        given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());
        LoginPolicyDto dto = LoginPolicyDto.builder().userId("ghost").build();

        assertThrows(BusinessException.class, () -> loginPolicyManageService.insertLoginPolicy(dto));
        verify(loginPolicyRepository, never()).save(any());
    }

    @Test
    @DisplayName("수정: 대상 정책이 없으면 RESOURCE_NOT_FOUND 로 끝난다")
    void updateThrowsWhenPolicyMissing() {
        given(loginPolicyRepository.findById("ghost")).willReturn(Optional.empty());
        LoginPolicyDto dto = LoginPolicyDto.builder().userId("ghost").build();

        // orElseThrow 람다의 `replaced return value with null` 뮤턴트가 여기서 죽는다.
        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.updateLoginPolicy(dto));
        assertEquals(CommonErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("삭제: 사용자 ID 로 실제 삭제를 호출한다")
    void deleteRemovesPolicyById() {
        LoginPolicyDto dto = LoginPolicyDto.builder().userId("tester").build();

        loginPolicyManageService.deleteLoginPolicy(dto);

        // `removed call to deleteById` 뮤턴트가 여기서 죽는다 —
        // 호출이 사라지면 "삭제했다" 는 응답과 달리 정책이 그대로 남는다.
        verify(loginPolicyRepository).deleteById("tester");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 자정 넘김 창의 허용식은 `(now ≥ start) || (now ≤ end)` 두 항의 OR 다.
    //   한 항만 검증하면 **다른 항을 뒤집은 뮤턴트가 단축평가로 살아남는다** —
    //   실제로 첫 시도에서 그랬다. 그래서 두 항을 각각 고립시키는 테스트를 나눠 둔다.
    //
    //   ⚠ 창을 now 기준 상대시각으로 잡으면 자정 부근에서 자동 스킵(assumeTrue)이 걸려
    //   CI 실행 시각에 따라 뮤턴트가 살았다 죽었다 한다 — 게이트가 흔들린다.
    //   종전에는 창을 하루 양 끝의 고정 시각으로 두어 스킵 구간을 1~2분으로 줄였고,
    //   [2026-09-13] 판정 시계를 고정해 스킵 자체를 없앴다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("자정 넘김 창: 자정 이후 구간(now ≤ end)만으로 허용된다")
    void overnightWindowAllowsViaEndBoundaryAlone() {
        fixClockAt(12, 0);
        // start(23:59) > end(23:58) → 자정 넘김 창. now 는 start 이전이므로 첫 항은 false.
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(
                LoginPolicy.create("tester", null, "Y", "N", "23:59", "23:58", "N")));

        // `now ≤ end` 를 뒤집은 뮤턴트는 두 항 모두 false 가 되어 차단 → 죽는다.
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
    }

    @Test
    @DisplayName("자정 넘김 창: 자정 이전 구간(now ≥ start)만으로 허용된다")
    void overnightWindowAllowsViaStartBoundaryAlone() {
        fixClockAt(12, 0);
        // start(00:01) > end(00:00) → 자정 넘김 창. now 는 end 이후이므로 둘째 항은 false.
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(
                LoginPolicy.create("tester", null, "Y", "N", "00:01", "00:00", "N")));

        // `now ≥ start` 를 뒤집은 뮤턴트는 두 항 모두 false 가 되어 차단 → 죽는다.
        // (첫 시도에서 이 항만 검증되지 않아 뮤턴트가 단축평가로 살아남았다.)
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간 형식이 깨져 있으면 통과시키지 않고 차단한다 (fail-closed)")
    void malformedTimeIsRejected() {
        // [2026-08-09 fail-open → fail-closed 전환]
        //   종전에는 파싱 실패를 삼키고 **제한이 걸리지 않은 채 통과**시켰다 —
        //   시간 형식이 깨지면 접속시간 제한이 통째로 무력화됐다.
        //   그때의 근거("전원 차단은 더 나쁘다")는 틀렸다. tb_login_policy 는 userId 로 키잉되므로
        //   파손된 정책의 영향 범위는 **그 사용자 한 명**이다.
        //   제한을 걸어 둔 데에는 이유가 있고, 규칙을 해석할 수 없을 때
        //   "모르겠으니 통과" 는 규칙을 없애는 것과 같다.
        //
        //   "abcd" → 콜론 없음·길이 4 → "ab:cd" 로 재조립 → parse 실패(DateTimeParseException).
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(
                LoginPolicy.create("tester", null, "Y", "N", "abcd", "efgh", "N")));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
        // 메시지는 정상적인 시간 제한과 구분돼야 한다 — 사용자가 "지금은 안 되는 시간" 으로
        //   오해하면 관리자에게 문의하지 않아 파손이 방치된다.
        assertTrue(ex.getMessage().contains("올바르지 않습니다"),
                "설정 오류임이 드러나는 메시지여야 한다: " + ex.getMessage());
    }

    @Test
    @DisplayName("목록 조회: 1-based pageIndex 변환과 기본 페이지 크기가 적용된다")
    void listAppliesPagingRules() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(3);
        vo.setPageUnit(0);
        given(loginPolicyRepository.searchLoginPolicies(any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        loginPolicyManageService.selectLoginPolicyList(vo);

        org.mockito.ArgumentCaptor<Pageable> captor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(loginPolicyRepository).searchLoginPolicies(any(), captor.capture());
        assertEquals(2, captor.getValue().getPageNumber(), "1-based 3페이지는 0-based 2");
        assertEquals(10, captor.getValue().getPageSize(), "pageUnit 0 이면 기본 10");
    }
}
