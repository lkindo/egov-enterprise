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

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 조회 기본 read-only; 쓰기(insert/update/delete)는 메서드 @Transactional 이 오버라이드
public class LoginPolicyManageService {

    private final LoginPolicyRepository loginPolicyRepository;
    private final UserRepository userRepository;

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
        String canonicalIpAddr = canonicalizeConfiguredIp(dto.getIpAddr());
        // [V2_13 결속] fk_tb_login_policy_tb_user_info(user_id UNIQUE 대상) — 유령 loginId 등록 차단
        userRepository.findByUserId(dto.getUserId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        LoginPolicy entity = LoginPolicy.builder()
                .userId(dto.getUserId())
                .ipAddr(canonicalIpAddr)
                .dpcnPrmYn(dto.getDpcnPrmYn())
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
        String canonicalIpAddr = canonicalizeConfiguredIp(dto.getIpAddr());
        LoginPolicy entity = loginPolicyRepository.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(canonicalIpAddr, dto.getDpcnPrmYn(), dto.getLmtYn(), dto.getBgngTm(), dto.getEndTm(), dto.getOtpUseYn());
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
                    java.time.LocalTime now = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Seoul"));
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
                    log.warn(">>> [LoginPolicy] 접속시간 정책을 해석할 수 없어 접속을 차단한다. "
                            + "userId={} bgngTm={} endTm={}",
                            userId, policy.getBgngTm(), policy.getEndTm(), e);
                    throw new BusinessException(
                            "접속 시간 정책이 올바르지 않습니다. 관리자에게 문의하십시오.",
                            CommonErrorCode.LOGIN_POLICY_TIME_RESTRICTED);
                }
            }
        });
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
