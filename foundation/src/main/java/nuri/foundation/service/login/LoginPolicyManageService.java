package nuri.foundation.service.login;
 
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.domain.login.LoginPolicy;
import nuri.foundation.domain.login.LoginPolicyRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.login.dto.LoginPolicyDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 로그인 정책 관리 서비스 구현체
 */
@Slf4j
@Service("loginPolicyManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoginPolicyManageService {

    private final LoginPolicyRepository loginPolicyRepository;
    private final UserRepository userRepository;

    /**
     * 로그인 정책 목록 조회
     */
    public List<LoginPolicyDto> selectLoginPolicyList(BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<User> userPage = userRepository.findAll(pageable);

        return userPage.getContent().stream().map(user -> {
            LoginPolicyDto dto = new LoginPolicyDto();
            dto.setEmplyrId(user.getUserId());
            dto.setEmplyrNm(user.getUserNm());

            LoginPolicy policy = loginPolicyRepository.findById(user.getUserId()).orElse(null);
            if (policy != null) {
                dto.setIpInfo(policy.getIpInfo());
                dto.setDplctPermAt(policy.getDplctPermAt());
                dto.setLmttAt(policy.getLmttAt());
                dto.setStartTime(policy.getStartTime());
                dto.setEndTime(policy.getEndTime());
                dto.setOtpEnabledAt(policy.getOtpEnabledAt());
                dto.setRegYn("Y");
            } else {
                dto.setRegYn("N");
            }
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * 로그인 정책 목록 총 갯수 조회
     */
    public int selectLoginPolicyListTotCnt(BaseSearchDto searchVO) {
        return (int) userRepository.count();
    }

    /**
     * 로그인 정책 상세 조회
     */
    public LoginPolicyDto selectLoginPolicy(String emplyrId) {
        User user = userRepository.findById(Objects.requireNonNull(emplyrId))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        LoginPolicyDto dto = new LoginPolicyDto();
        dto.setEmplyrId(user.getUserId());
        dto.setEmplyrNm(user.getUserNm());

        LoginPolicy policy = loginPolicyRepository.findById(Objects.requireNonNull(emplyrId)).orElse(null);
        if (policy != null) {
            dto.setIpInfo(policy.getIpInfo());
            dto.setDplctPermAt(policy.getDplctPermAt());
            dto.setLmttAt(policy.getLmttAt());
            dto.setStartTime(policy.getStartTime());
            dto.setEndTime(policy.getEndTime());
            dto.setOtpEnabledAt(policy.getOtpEnabledAt());
            dto.setRegYn("Y");
        } else {
            dto.setRegYn("N");
        }
        return dto;
    }

    /**
     * 로그인 정책 등록
     */
    @Transactional
    public void insertLoginPolicy(LoginPolicyDto dto) {
        LoginPolicy entity = LoginPolicy.builder()
                .emplyrId(dto.getEmplyrId())
                .ipInfo(dto.getIpInfo())
                .dplctPermAt(dto.getDplctPermAt())
                .lmttAt(dto.getLmttAt())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .otpEnabledAt(dto.getOtpEnabledAt())
                .createdBy(dto.getFrstRegisterId())
                .build();
        loginPolicyRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * 로그인 정책 정보 수정
     */
    @Transactional
    public void updateLoginPolicy(LoginPolicyDto dto) {
        LoginPolicy entity = loginPolicyRepository.findById(Objects.requireNonNull(dto.getEmplyrId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
        entity.update(dto.getIpInfo(), dto.getDplctPermAt(), dto.getLmttAt(), dto.getStartTime(), dto.getEndTime(), dto.getOtpEnabledAt());
    }

    /**
     * 로그인 정책 삭제
     */
    @Transactional
    public void deleteLoginPolicy(String emplyrId) {
        loginPolicyRepository.deleteById(Objects.requireNonNull(emplyrId));
    }

    /**
     * 로그인 정책 유효성 검증
     * @param userId 사용자 ID
     * @param clientIp 클라이언트 IP
     * @throws BusinessException 정책 위반 시
     */
    public void validateLoginPolicy(String userId, String clientIp) {
        LoginPolicy policy = loginPolicyRepository.findById(userId).orElse(null);
        if (policy == null) return;

        // 1. 제한 여부 체크
        if ("Y".equals(policy.getLmttAt())) {
            throw new BusinessException(ErrorCode.LOGIN_POLICY_LIMITED);
        }

        // 2. IP 제한 체크
        if (policy.getIpInfo() != null && !policy.getIpInfo().isEmpty()) {
            if (!policy.getIpInfo().equals(clientIp)) {
                log.warn(">>> [Login Policy] IP Mismatch. Expected: {}, Actual: {}", policy.getIpInfo(), clientIp);
                throw new BusinessException(ErrorCode.LOGIN_POLICY_IP_MISMATCH);
            }
        }

        // 3. 접속 시간 체크
        if (policy.getStartTime() != null && !policy.getStartTime().isEmpty() &&
            policy.getEndTime() != null && !policy.getEndTime().isEmpty()) {
            
            LocalTime now = LocalTime.now();
            LocalTime start = LocalTime.parse(policy.getStartTime(), DateTimeFormatter.ofPattern("HH:mm"));
            LocalTime end = LocalTime.parse(policy.getEndTime(), DateTimeFormatter.ofPattern("HH:mm"));

            boolean isAllowed;
            if (start.isBefore(end)) {
                // 일반적인 시간 범위 (예: 09:00 ~ 18:00)
                isAllowed = !now.isBefore(start) && !now.isAfter(end);
            } else {
                // 자정을 넘기는 시간 범위 (예: 22:00 ~ 06:00)
                isAllowed = !now.isBefore(start) || !now.isAfter(end);
            }

            if (!isAllowed) {
                log.warn(">>> [Login Policy] Time Restriction. Allowed: {} - {}, Current: {}", policy.getStartTime(), policy.getEndTime(), now);
                throw new BusinessException(ErrorCode.LOGIN_POLICY_TIME_RESTRICTED);
            }
        }
    }
}
