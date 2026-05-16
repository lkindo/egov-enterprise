package nuri.foundation.service.login;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import nuri.foundation.domain.login.LoginPolicy;
import nuri.foundation.domain.login.LoginPolicyRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.login.dto.LoginPolicyDto;
import nuri.foundation.domain.common.BaseSearchDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service("egovLoginPolicyManageService")
@RequiredArgsConstructor
public class LoginPolicyManageService extends BaseAbstractService implements EgovLoginPolicyManageService {

    private final LoginPolicyRepository loginPolicyRepository;
    private final UserRepository userRepository;

    @Override
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

    @Override
    public int selectLoginPolicyListTotCnt(BaseSearchDto searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) loginPolicyRepository.searchLoginPolicies(searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    @Override
    public LoginPolicyDto selectLoginPolicy(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        LoginPolicyDto dto = LoginPolicyDto.builder()
                .userId(user.getEsntlId()) // Should use EsntlId for DB search? Entity uses USER_ID as PK but some logic might vary.
                .userNm(user.getUserNm())
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

    @Override
    @Transactional
    public void insertLoginPolicy(LoginPolicyDto dto) {
        LoginPolicy entity = LoginPolicy.builder()
                .userId(dto.getUserId())
                .ipAddr(dto.getIpAddr())
                .dpcnPrmYn(dto.getDpcnPrmYn())
                .lmtYn(dto.getLmtYn())
                .bgngTm(dto.getBgngTm())
                .endTm(dto.getEndTm())
                .otpUseYn(dto.getOtpUseYn())
                .createdBy("SYSTEM")
                .build();
        loginPolicyRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateLoginPolicy(LoginPolicyDto dto) {
        LoginPolicy entity = loginPolicyRepository.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getIpAddr(), dto.getDpcnPrmYn(), dto.getLmtYn(), dto.getBgngTm(), dto.getEndTm(), dto.getOtpUseYn());
    }

    @Override
    @Transactional
    public void deleteLoginPolicy(LoginPolicyDto dto) {
        loginPolicyRepository.deleteById(dto.getUserId());
    }

    @Override
    public void validateLoginPolicy(String userId, String clientIp) {
        loginPolicyRepository.findById(userId).ifPresent(policy -> {
            if ("Y".equals(policy.getLmtYn())) {
                // IP Check
                if (policy.getIpAddr() != null && !policy.getIpAddr().isEmpty() && !policy.getIpAddr().equals(clientIp)) {
                    throw new BusinessException("허용되지 않은 IP에서의 접속입니다.", ErrorCode.INVALID_INPUT_VALUE);
                }
                // Time Check can be added here
            }
        });
    }
}
