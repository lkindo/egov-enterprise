package nuri.foundation.service.login;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.login.LoginPolicy;
import nuri.foundation.domain.login.LoginPolicyRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.login.dto.LoginPolicyDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
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
@Service("loginPolicyManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoginPolicyManageService {

    private final LoginPolicyRepository loginPolicyRepository;
    private final UserRepository userRepository;

    /**
     * 로그인 정책 목록 조회
     */
    public List<LoginPolicyDto> selectLoginPolicyList(ComDefaultVO searchVO) {
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
    public int selectLoginPolicyListTotCnt(ComDefaultVO searchVO) {
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
        entity.update(dto.getIpInfo(), dto.getDplctPermAt(), dto.getLmttAt());
    }

    /**
     * 로그인 정책 삭제
     */
    @Transactional
    public void deleteLoginPolicy(String emplyrId) {
        loginPolicyRepository.deleteById(Objects.requireNonNull(emplyrId));
    }
}
