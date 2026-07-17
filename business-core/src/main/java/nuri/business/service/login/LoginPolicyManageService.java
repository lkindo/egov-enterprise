package nuri.business.service.login;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.login.LoginPolicy;
import nuri.business.domain.login.LoginPolicyRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.login.dto.LoginPolicyDto;
import nuri.business.domain.common.BaseSearchDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 조회 기본 read-only; 쓰기(insert/update/delete)는 메서드 @Transactional 이 오버라이드
public class LoginPolicyManageService extends BaseAbstractService {

    private final LoginPolicyRepository loginPolicyRepository;
    private final UserRepository userRepository;

    public List<LoginPolicyDto> selectLoginPolicyList(BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        return loginPolicyRepository.searchLoginPolicies(searchVO.getSearchKeyword(), pageable)
                .getContent().stream()
                .map(res -> {
                    LoginPolicyDto dto = LoginPolicyDto.builder()
                            .userId(res.getUserId())
                            .userNm(res.getUserNm())
                            .regYn(res.getRegYn())
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
        // [V2_13 결속] fk_tb_login_policy_tb_user_info(user_id UNIQUE 대상) — 유령 loginId 등록 차단
        userRepository.findByUserId(dto.getUserId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        LoginPolicy entity = LoginPolicy.builder()
                .userId(dto.getUserId())
                .ipAddr(dto.getIpAddr())
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
        LoginPolicy entity = loginPolicyRepository.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getIpAddr(), dto.getDpcnPrmYn(), dto.getLmtYn(), dto.getBgngTm(), dto.getEndTm(), dto.getOtpUseYn());
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
            if (policy.getIpAddr() != null && !policy.getIpAddr().isEmpty() && !policy.getIpAddr().equals(clientIp)) {
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
                    e.printStackTrace();
                }
            }
        });
    }
}
