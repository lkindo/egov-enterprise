package nuri.business.service.login;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.net.IpAddressCanonicalizer;
import nuri.business.domain.login.LoginPolicy;
import nuri.business.domain.login.LoginPolicyRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.login.dto.LoginPolicyDto;
import nuri.business.domain.common.BaseSearchDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 조회 기본 read-only; 쓰기(insert/update/delete)는 메서드 @Transactional 이 오버라이드
public class LoginPolicyManageService {

    private final LoginPolicyRepository loginPolicyRepository;
    private final UserRepository userRepository;

    /**
     * 접속 허용 시간창 판정의 기준 시계. 운영에서는 항상 Asia/Seoul 시스템 시계다.
     *
     * <p>[2026-09-13] 종전에는 판정이 {@code LocalTime.now(Asia/Seoul)} 를 직접 불러 테스트가 고정 시각을
     * 넣을 수 없었다. 그래서 시간창 테스트들이 현재 시각 기준 상대 창을 만들고 자정 부근·저녁 시간대에는
     * {@code assumeTrue} 로 <b>건너뛰었다</b> — 필수 mutation 게이트(business-core-auth)가 실행하는 테스트 집합이
     * CI 실행 시각에 따라 달라졌다(실측: KST 19:04 에 'HHmm' 차단 테스트 1건이 skip, 자정 부근에는 더 많은 창 테스트가 skip).
     * 생성자 주입으로 바꾸면 스프링 빈 구성과 기존 생성 경로가 함께 흔들리므로, 기본값을 둔 필드와
     * 같은 패키지 전용 교체 지점만 연다.
     */
    private Clock clock = Clock.system(ZoneId.of("Asia/Seoul"));

    /** 테스트 전용 — 시간창 판정의 기준 시각을 고정한다. */
    void useClock(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    public List<LoginPolicyDto> selectLoginPolicyList(BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();
        return loginPolicyRepository.searchLoginPolicies(searchVO.getSearchKeyword(), pageable)
                .getContent().stream()
                .map(res -> {
                    /*
                     * [2026-08-29] 보안 필드를 실제로 실어 보낸다.
                     *
                     * 종전에는 userId·userNm·regYn 만 채웠다. 그런데 목록 화면은 그 옆에
                     * '제한 IP'·'허용 시간'·'계정 제한'·'2FA(OTP)' 네 열을 두고 값을 보여 준다 —
                     * 전부 null 이라 **모든 사용자가 '제한 없음'·'24시간'·'정상'·'DISABLED'** 로
                     * 보였다. 보안 열이므로 관리자는 그 화면을 보고 "아무도 IP 제한이 없고
                     * MFA 도 꺼져 있다" 고 결론 내린다.
                     *
                     * 값은 이미 projection 이 조회하고 있었다(otpUseYn 만 추가). 상세 조회
                     * (selectLoginPolicy)는 처음부터 같은 값을 채우고 있었으므로, 목록과 상세가
                     * 같은 사실을 말하게 되는 것이기도 하다.
                     */
                    LoginPolicyDto dto = LoginPolicyDto.builder()
                            .userId(res.getUserId())
                            .userNm(res.getUserNm())
                            .regYn(res.getRegYn())
                            .ipAddr(res.getIpAddr())
                            .dpcnPrmYn(res.getDpcnPrmYn())
                            .lmtYn(res.getLmtYn())
                            .bgngTm(res.getBgngTm())
                            .endTm(res.getEndTm())
                            .otpUseYn(res.getOtpUseYn())
                            .build();
                    return dto;
                }).collect(Collectors.toList());
    }

    public int selectLoginPolicyListTotCnt(BaseSearchDto searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) loginPolicyRepository.searchLoginPolicies(searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    public LoginPolicyDto selectLoginPolicy(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // [V2_13 결속] tb_login_policy 의 키는 loginId(userId) — esntlId 를 돌려주던 키 혼용 결함 정정.
        // (esntlId 반환 시 클라이언트가 그 값으로 재기록하여 FK 위반/정책 무력화를 유발)
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .regYn("N")
                .build();

        loginPolicyRepository.findById(user.getUserId()).ifPresent(policy -> {
            dto.setIpAddr(policy.getIpAddr());
            dto.setDpcnPrmYn(policy.getDpcnPrmYn());
            dto.setLmtYn(policy.getLmtYn());
            dto.setBgngTm(policy.getBgngTm());
            dto.setEndTm(policy.getEndTm());
            dto.setOtpUseYn(policy.getOtpUseYn());
            dto.setRegYn("Y");
        });

        return dto;
    }

    @Transactional
    public void insertLoginPolicy(LoginPolicyDto dto) {
        rejectUnsupportedOtp(dto);
        String canonicalIpAddr = canonicalizeConfiguredIp(dto.getIpAddr());
        // [V2_13 결속] fk_tb_login_policy_tb_user_info(user_id UNIQUE 대상) — 유령 loginId 등록 차단
        userRepository.findByUserId(dto.getUserId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        LoginPolicy entity = LoginPolicy.builder()
                .userId(dto.getUserId())
                .ipAddr(canonicalIpAddr)
                // 중복 허용 여부는 화면 폼이 보내지 않는다(loginPolicySchema 의 .pick). 요청에 없으면 'N' 으로 시작한다 —
                // 종전에는 새 행이 NULL 로 시작했고 CHECK (dpcn_prm_yn IN ('Y','N'))(V2_24)는 NULL 을 통과시켰다.
                // 온라인 투표 등록(pollAtmcDsuseYn)과 같은 형태다. 수정 경로는 기존 값을 유지한다(아래 참조).
                .dpcnPrmYn(dto.getDpcnPrmYn() != null ? dto.getDpcnPrmYn() : "N")
                .lmtYn(dto.getLmtYn())
                .bgngTm(dto.getBgngTm())
                .endTm(dto.getEndTm())
                .otpUseYn(dto.getOtpUseYn())
                .build();
        entity.setFrstRgtrId("SYSTEM"); // 시스템 정책 작성자는 SYSTEM 으로 명시 유지(하위 호환)
        loginPolicyRepository.save(entity);
    }

    @Transactional
    public void updateLoginPolicy(LoginPolicyDto dto) {
        rejectUnsupportedOtp(dto);
        String canonicalIpAddr = canonicalizeConfiguredIp(dto.getIpAddr());
        LoginPolicy entity = loginPolicyRepository.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        /*
          중복 로그인 허용 여부는 요청에 없으면 기존 값을 유지한다(GAP-POLICY-001).

          엔티티 update 는 전체 치환이고 화면 폼은 다섯 필드(ipAddr·lmtYn·bgngTm·endTm·otpUseYn)만
          보낸다(loginPolicySchema 의 .pick). 그래서 저장할 때마다 dpcn_prm_yn 이 null 로 덮어써졌고,
          CHECK (dpcn_prm_yn IN ('Y','N'))(V2_24)는 PostgreSQL 규칙상 NULL 을 통과시켜 아무것도
          실패하지 않았다.

          ⚠ 수정 경로에는 null→'N' 보정을 두지 않는다 — 화면이 이 값을 보내지 않으므로 저장마다
            'Y'(중복 허용)를 'N' 으로 뒤집게 된다. 소실을 더 나쁜 결함으로 바꾸는 셈이다.
            DEC-OPS-082(온라인 투표 pollAtmcDsuseYn)가 같은 형태에서 같은 해법을 택했다.
            등록 경로(insertLoginPolicy)는 2026-09-22 부터 값이 없으면 'N' 을 저장하므로 새 행은 NULL 로
            시작하지 않는다 — 종전 주석은 등록에 보정이 있다고 전제했으나 실제로는 없었다.

          비대칭은 의도다 — 다섯 필드는 컨트롤이 있고 이 하나는 없다. 컨트롤이 생기면 이 분기를 걷는다.
        */
        String dpcnPrmYn = dto.getDpcnPrmYn() != null ? dto.getDpcnPrmYn() : entity.getDpcnPrmYn();
        entity.update(canonicalIpAddr, dpcnPrmYn, dto.getLmtYn(), dto.getBgngTm(), dto.getEndTm(), dto.getOtpUseYn());
    }

    @Transactional
    public void deleteLoginPolicy(LoginPolicyDto dto) {
        loginPolicyRepository.deleteById(dto.getUserId());
    }

    public void validateLoginPolicy(String userId, String clientIp) {
        loginPolicyRepository.findById(userId).ifPresent(policy -> {
            if ("Y".equals(policy.getLmtYn())) {
                throw new BusinessException("접속이 제한된 계정입니다.", CommonErrorCode.LOGIN_POLICY_LIMITED);
            }
            if (policy.getIpAddr() != null && !policy.getIpAddr().isEmpty()
                    && !sameIpAddress(policy.getIpAddr(), clientIp)) {
                throw new BusinessException("허용되지 않은 IP에서의 접속입니다.", CommonErrorCode.LOGIN_POLICY_IP_MISMATCH);
            }
            if (policy.getBgngTm() != null && !policy.getBgngTm().isEmpty() && policy.getEndTm() != null && !policy.getEndTm().isEmpty()) {
                try {
                    java.time.LocalTime now = java.time.LocalTime.now(clock);
                    String bgng = policy.getBgngTm();
                    String end = policy.getEndTm();
                    if (!bgng.contains(":") && bgng.length() >= 4) {
                        bgng = bgng.substring(0, 2) + ":" + bgng.substring(2, 4);
                    }
                    if (!end.contains(":") && end.length() >= 4) {
                        end = end.substring(0, 2) + ":" + end.substring(2, 4);
                    }
                    
                    java.time.LocalTime startTime = java.time.LocalTime.parse(bgng, java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                    java.time.LocalTime endTime = java.time.LocalTime.parse(end, java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                    // 자정 넘는 허용 창(start > end, 예: 22:00~06:00) 처리: 그 경우 [start,24:00) ∪ [00:00,end] 를 허용.
                    boolean withinWindow = startTime.isBefore(endTime)
                            ? (!now.isBefore(startTime) && !now.isAfter(endTime))
                            : (!now.isBefore(startTime) || !now.isAfter(endTime));
                    if (!withinWindow) {
                        throw new BusinessException("제한된 접속 시간입니다.", CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED);
                    }
                } catch (BusinessException ex) {
                    throw ex;
                } catch (Exception e) {
                    // [2026-08-09 fail-open → fail-closed 전환]
                    //
                    //   종전에는 파싱 실패를 삼키고 **제한이 걸리지 않은 채 통과**시켰다.
                    //   즉 시간 형식이 깨지면 접속시간 제한이 통째로 무력화됐다.
                    //   그때의 근거는 "정책 파손으로 전원 로그인 차단은 더 나쁘다" 였는데,
                    //   **그 판단은 틀렸다** — tb_login_policy 는 userId 로 키잉되므로
                    //   파손된 정책의 영향 범위는 **그 사용자 한 명**이다. 전원이 아니다.
                    //
                    //   제한을 걸어 둔 데에는 이유가 있다. 그 규칙을 해석할 수 없을 때
                    //   "모르겠으니 통과" 는 규칙을 없애는 것과 같다. 차단하고 알린다.
                    //   (전환 시점 실측: tb_login_policy 0행 — 현재 영향받는 사용자 없음.)
                    //
                    //   메시지는 정상적인 시간 제한과 구분한다 — 사용자가 "지금은 안 되는 시간"
                    //   으로 오해하면 관리자에게 문의하지 않아 파손이 방치된다.
                    log.warn(">>> [LoginPolicy] 접속시간 정책 형식 오류로 접속을 차단한다.");
                    throw new BusinessException(
                            "접속 시간 정책이 올바르지 않습니다. 관리자에게 문의하십시오.",
                            CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED);
                }
            }
        });
    }

    /**
     * 2단계 인증(OTP) 설정을 켜지 못하게 한다(2026-09-25 DIP D6).
     *
     * <p>로그인은 OTP 가 켜진 사용자에게 번호를 요구하지만, 비밀키를 발급하거나 사용자가 번호를 입력하는
     * 화면이 제품에 없다. 켜는 순간 그 사용자는 어떤 방법으로도 로그인할 수 없다 — 잠금과 같은 결과를
     * "보안 강화" 처럼 보이는 스위치가 만든다. 등록 흐름을 만들기 전까지 서버가 거부한다. 끄는 것은 허용한다.
     */
    private static void rejectUnsupportedOtp(LoginPolicyDto dto) {
        if ("Y".equals(dto.getOtpUseYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "2단계 인증(OTP)은 아직 제공하지 않습니다. 비밀키 발급·입력 경로가 없어 켜면 그 사용자는 로그인할 수 없습니다.");
        }
    }

    /** 빈 값은 IP 제한 없음이며, 비어 있지 않은 값은 DNS 없는 IP 리터럴만 허용한다. */
    private static String canonicalizeConfiguredIp(String ipAddr) {
        if (ipAddr == null || ipAddr.isBlank()) {
            return null;
        }
        try {
            return IpAddressCanonicalizer.canonicalize(ipAddr);
        } catch (IllegalArgumentException invalidAddress) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "IP 주소는 유효한 IPv4 또는 IPv6 리터럴이어야 합니다.");
        }
    }

    /** 저장된 legacy 표기까지 양쪽을 정규화해 비교한다. 파싱 불가 값은 제한을 풀지 않고 불일치로 본다. */
    private static boolean sameIpAddress(String configuredIp, String clientIp) {
        try {
            return IpAddressCanonicalizer.canonicalize(configuredIp)
                    .equals(IpAddressCanonicalizer.canonicalize(clientIp));
        } catch (IllegalArgumentException invalidAddress) {
            return false;
        }
    }
}
