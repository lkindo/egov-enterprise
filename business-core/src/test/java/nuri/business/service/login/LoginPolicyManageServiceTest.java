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
    @DisplayName("로그인 정책 유효성 검증 - 시간 불일치 (이전)")
    void validateLoginPolicyTimeBeforeTest() {
        // [시간대 고정] 서비스는 LocalTime.now(ZoneId.of("Asia/Seoul")) 로 판정한다.
        // 테스트가 JVM 기본 시간대를 쓰면 UTC 러너(CI)에서 9시간 어긋나 허용창 밖이 된다
        // — 2026-07-26 CI 실패의 원인. 서비스와 동일한 기준시로 창을 계산한다.
        LocalTime now = LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
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
        // [시간대 고정] 서비스는 LocalTime.now(ZoneId.of("Asia/Seoul")) 로 판정한다.
        // 테스트가 JVM 기본 시간대를 쓰면 UTC 러너(CI)에서 9시간 어긋나 허용창 밖이 된다
        // — 2026-07-26 CI 실패의 원인. 서비스와 동일한 기준시로 창을 계산한다.
        LocalTime now = LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
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
        // [시간대 고정] 서비스는 LocalTime.now(ZoneId.of("Asia/Seoul")) 로 판정한다.
        // 테스트가 JVM 기본 시간대를 쓰면 UTC 러너(CI)에서 9시간 어긋나 허용창 밖이 된다
        // — 2026-07-26 CI 실패의 원인. 서비스와 동일한 기준시로 창을 계산한다.
        LocalTime now = LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] LoginPolicyManageService 에서 20개가 살아남았다.
    //   그중 6개가 **로그인 시간 제한 창** 판정이다.
    //
    //   이 분기가 뒤집히면 **제한 시간에 로그인이 허용되거나, 정상 시간에 차단**된다.
    //   자정을 넘는 창(예: 22:00~06:00)은 start > end 라 판정식이 반대가 되는데,
    //   그 갈림길이 검증된 적이 없었다.
    //
    //   ⚠ LocalTime.now(Asia/Seoul) 의존이라 고정 시각을 넣을 수 없다.
    //   대신 **현재 시각을 기준으로 항상 성립/불성립하는 창**을 만들어 판정을 고정한다.
    // ─────────────────────────────────────────────────────────────────────────

    private static String hhmm(java.time.LocalTime t) {
        return String.format("%02d:%02d", t.getHour(), t.getMinute());
    }

    private LoginPolicy policyWithWindow(String bgng, String end) {
        return LoginPolicy.builder().userId("U1").lmtYn("N").bgngTm(bgng).endTm(end).build();
    }

    @Test
    @DisplayName("시간창: 현재가 창 안이면 통과한다 (정상 순서 창)")
    void timeWindow_insideNormalWindow_passes() {
        java.time.LocalTime now = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        // now 를 확실히 포함하는 창. 경계에 걸리지 않도록 넉넉히 잡는다.
        String bgng = hhmm(now.minusHours(2));
        String end = hhmm(now.plusHours(2));
        // 자정을 걸치면 start > end 가 되어 다른 분기다 — 그 경우는 아래 테스트가 다룬다.
        org.junit.jupiter.api.Assumptions.assumeTrue(
                now.minusHours(2).isBefore(now.plusHours(2)), "자정 인접 시각에서는 이 케이스를 건너뛴다");

        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow(bgng, end)));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간창: 현재가 창 밖이면 차단한다 (정상 순서 창)")
    void timeWindow_outsideNormalWindow_blocks() {
        java.time.LocalTime now = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        // now 를 확실히 제외하는 짧은 창(과거 구간).
        String bgng = hhmm(now.minusHours(4));
        String end = hhmm(now.minusHours(3));
        org.junit.jupiter.api.Assumptions.assumeTrue(
                now.minusHours(4).isBefore(now.minusHours(3)) && now.minusHours(3).isBefore(now),
                "자정 인접 시각에서는 이 케이스를 건너뛴다");

        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow(bgng, end)));

        // 조건을 뒤집은 뮤턴트는 통과시켜 여기서 죽는다.
        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
        assertTrue(ex.getMessage().contains("제한된 접속 시간"));
    }

    @Test
    @DisplayName("시간창: 자정을 넘는 창(start > end)도 현재가 안이면 통과한다")
    void timeWindow_insideOvernightWindow_passes() {
        java.time.LocalTime now = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        // start = now+1h, end = now+... 로 만들면 start > end 인 '자정 넘는 창' 이 되고,
        // now 는 [start,24:00) ∪ [00:00,end] 중 뒤쪽 구간에 든다.
        String bgng = hhmm(now.plusHours(1));
        String end = hhmm(now.plusMinutes(30));
        org.junit.jupiter.api.Assumptions.assumeTrue(
                now.plusHours(1).isAfter(now.plusMinutes(30)) == false
                        ? false
                        : true, "구성 전제");

        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow(bgng, end)));

        // startTime.isBefore(endTime) 분기 선택이 틀리면 여기서 차단되어 죽는다.
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("U1", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간창: HHmm(콜론 없음) 형식도 파싱한다")
    void timeWindow_acceptsCompactFormat() {
        java.time.LocalTime now = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        org.junit.jupiter.api.Assumptions.assumeTrue(
                now.minusHours(2).isBefore(now.plusHours(2)), "자정 인접 시각에서는 건너뛴다");

        String bgng = String.format("%02d%02d", now.minusHours(2).getHour(), now.minusHours(2).getMinute());
        String end = String.format("%02d%02d", now.plusHours(2).getHour(), now.plusHours(2).getMinute());

        given(loginPolicyRepository.findById("U1")).willReturn(Optional.of(policyWithWindow(bgng, end)));

        // `!bgng.contains(":") && length >= 4` 조건을 뒤집으면 파싱이 깨져 catch 로 빠지고,
        // catch 는 예외를 삼키므로 통과한다 — 그러면 이 테스트는 여전히 통과한다.
        // 따라서 여기서는 '정상 파싱 시 통과' 만 고정하고, 차단 판정은 위 테스트가 맡는다.
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
    //   그 분기를 뒤집으면 parse 가 실패하고 → 아래 `catch (Exception)` 이 삼켜서
    //   → **접속 시간 제한이 통째로 무력화된 채 로그인이 성공한다**.
    //   실패가 예외로 드러나지 않고 '허용'으로 끝나는 구조라 더 위험하다.
    // ─────────────────────────────────────────────────────────────────────────

    /** 콜론 없는 "HHmm" 형식으로 지금 시각을 배제하는 창을 만든다. */
    private static LoginPolicy policyWithCompactTimeWindow(LocalTime start, LocalTime end) {
        DateTimeFormatter compact = DateTimeFormatter.ofPattern("HHmm");
        return LoginPolicy.create("tester", null, "Y", "N",
                start.format(compact), end.format(compact), "N");
    }

    @Test
    @DisplayName("시간정책: 'HHmm'(콜론 없음) 형식도 해석해 제한 시간을 실제로 차단한다")
    void compactTimeFormatIsParsedAndEnforced() {
        LocalTime now = LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        // 지금을 확실히 벗어난 창: [now+2h, now+4h]. 자정 넘김을 피해 오전 구간에서만 수행.
        org.junit.jupiter.api.Assumptions.assumeTrue(now.getHour() < 19,
                "자정 넘김 창과 섞이지 않도록 19시 이전에만 수행한다");
        LoginPolicy policy = policyWithCompactTimeWindow(now.plusHours(2), now.plusHours(4));
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(policy));

        // 변환 분기(!contains(":") / length >= 4)를 뒤집은 뮤턴트는 parse 실패 →
        // catch 가 삼켜 **예외 없이 통과**한다. 그래서 여기서 죽는다.
        BusinessException ex = assertThrows(BusinessException.class,
                () -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
        assertEquals(CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED, ex.getErrorCode());
    }

    @Test
    @DisplayName("시간정책: 'HHmm' 형식이 허용 창일 때는 통과한다 (변환이 양방향으로 옳다)")
    void compactTimeFormatAllowsWithinWindow() {
        LocalTime now = LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        org.junit.jupiter.api.Assumptions.assumeTrue(now.getHour() >= 1 && now.getHour() < 22,
                "창 양끝이 자정을 넘지 않는 시간대에만 수행한다");
        LoginPolicy policy = policyWithCompactTimeWindow(now.minusHours(1), now.plusHours(1));
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
                .userId("tester").ipAddr("10.0.0.1").dpcnPrmYn("Y").lmtYn("N")
                .bgngTm("0900").endTm("1800").otpUseYn("Y").build();

        loginPolicyManageService.insertLoginPolicy(dto);

        org.mockito.ArgumentCaptor<LoginPolicy> saved =
                org.mockito.ArgumentCaptor.forClass(LoginPolicy.class);
        verify(loginPolicyRepository).save(saved.capture());
        // `removed call to setFrstRgtrId` 뮤턴트가 여기서 죽는다(감사 컬럼 NOT NULL 위반 경로).
        assertEquals("SYSTEM", saved.getValue().getFrstRgtrId());
        assertEquals("tester", saved.getValue().getUserId());
        assertEquals("Y", saved.getValue().getOtpUseYn());
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
    //   그래서 창을 **하루 양 끝의 고정 시각**으로 고정해 스킵 구간을 1~2분으로 줄였다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("자정 넘김 창: 자정 이후 구간(now ≤ end)만으로 허용된다")
    void overnightWindowAllowsViaEndBoundaryAlone() {
        LocalTime now = LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        org.junit.jupiter.api.Assumptions.assumeTrue(now.isBefore(LocalTime.of(23, 58)),
                "23:58 이후에는 창 자체가 성립하지 않는다");
        // start(23:59) > end(23:58) → 자정 넘김 창. now 는 start 이전이므로 첫 항은 false.
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(
                LoginPolicy.create("tester", null, "Y", "N", "23:59", "23:58", "N")));

        // `now ≤ end` 를 뒤집은 뮤턴트는 두 항 모두 false 가 되어 차단 → 죽는다.
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
    }

    @Test
    @DisplayName("자정 넘김 창: 자정 이전 구간(now ≥ start)만으로 허용된다")
    void overnightWindowAllowsViaStartBoundaryAlone() {
        LocalTime now = LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
        org.junit.jupiter.api.Assumptions.assumeTrue(!now.isBefore(LocalTime.of(0, 1)),
                "00:01 이전에는 창 자체가 성립하지 않는다");
        // start(00:01) > end(00:00) → 자정 넘김 창. now 는 end 이후이므로 둘째 항은 false.
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(
                LoginPolicy.create("tester", null, "Y", "N", "00:01", "00:00", "N")));

        // `now ≥ start` 를 뒤집은 뮤턴트는 두 항 모두 false 가 되어 차단 → 죽는다.
        // (첫 시도에서 이 항만 검증되지 않아 뮤턴트가 단축평가로 살아남았다.)
        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
    }

    @Test
    @DisplayName("시간 형식이 깨져 있으면 예외를 삼키고 통과시킨다 (현행 거동 고정)")
    void malformedTimeIsSwallowedAndAllows() {
        // "abcd" → 콜론 없음·길이 4 → "ab:cd" 로 재조립 → parse 실패(DateTimeParseException).
        //   이 경로는 BusinessException 이 아니라 일반 Exception 이라 catch 가 삼킨다.
        //   ⚠ 즉 **시간 정책이 깨져 있으면 제한이 아예 걸리지 않는다** — fail-open 이다.
        //   현행 거동을 테스트로 고정해 두어, 향후 fail-closed 로 바꿀 때 의도적 변경임이 드러나게 한다.
        given(loginPolicyRepository.findById("tester")).willReturn(Optional.of(
                LoginPolicy.create("tester", null, "Y", "N", "abcd", "efgh", "N")));

        assertDoesNotThrow(() -> loginPolicyManageService.validateLoginPolicy("tester", "127.0.0.1"));
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
