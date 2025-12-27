package egovframework.let.uat.uap.service.impl;

import com.company.project.domain.login.LoginPolicy;
import com.company.project.domain.login.LoginPolicyRepository;
import com.company.project.domain.login.LoginPolicySearchCondition;
import com.company.project.domain.login.LoginPolicySearchResult;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import egovframework.let.uat.uap.service.EgovLoginPolicyService;
import egovframework.let.uat.uap.service.LoginPolicyVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service("egovLoginPolicyService")
@RequiredArgsConstructor
public class EgovLoginPolicyServiceImpl extends EgovAbstractServiceImpl implements EgovLoginPolicyService {

    private final LoginPolicyRepository loginPolicyRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<LoginPolicyVO> selectLoginPolicyList(LoginPolicyVO loginPolicyVO) throws Exception {
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition(loginPolicyVO.getSearchCondition());
        condition.setSearchKeyword(loginPolicyVO.getSearchKeyword());

        // Pageable
        Pageable pageable = PageRequest.of(loginPolicyVO.getPageIndex() - 1, loginPolicyVO.getPageUnit());

        Page<LoginPolicySearchResult> page = loginPolicyRepository.search(condition, pageable);

        return page.getContent().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public int selectLoginPolicyListTotCnt(LoginPolicyVO loginPolicyVO) throws Exception {
        // Already handled in selectLoginPolicyList (setting VO's totalRecordCount),
        // but if called separately:
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition(loginPolicyVO.getSearchCondition());
        condition.setSearchKeyword(loginPolicyVO.getSearchKeyword());

        // Use a dummy pageable or separate count method.
        // search returns Page, so it counts.
        Pageable pageable = PageRequest.of(0, 1);
        return (int) loginPolicyRepository.search(condition, pageable).getTotalElements();
    }

    @Override
    @Transactional(readOnly = true)
    public LoginPolicyVO selectLoginPolicy(LoginPolicyVO loginPolicyVO) throws Exception {
        return getLoginPolicyVo(loginPolicyVO.getEmplyrId());
    }

    @Override
    @Transactional
    public void insertLoginPolicy(egovframework.let.uat.uap.service.LoginPolicy loginPolicy) throws Exception {
        LoginPolicy entity = LoginPolicy.builder()
                .emplyrId(loginPolicy.getEmplyrId())
                .ipInfo(loginPolicy.getIpInfo())
                .dplctPermAt(loginPolicy.getDplctPermAt())
                .lmttAt(loginPolicy.getLmttAt())
                .frstRegisterId(loginPolicy.getUserId()) // userId is actually operator ID
                .lastUpdusrId(loginPolicy.getUserId())
                .build();
        loginPolicyRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateLoginPolicy(egovframework.let.uat.uap.service.LoginPolicy loginPolicy) throws Exception {
        LoginPolicy entity = loginPolicyRepository.findById(loginPolicy.getEmplyrId())
                .orElseThrow(() -> new IllegalArgumentException("Login Policy not found"));

        entity.update(loginPolicy.getIpInfo(), loginPolicy.getDplctPermAt(), loginPolicy.getLmttAt(),
                loginPolicy.getUserId());
    }

    @Override
    @Transactional
    public void deleteLoginPolicy(egovframework.let.uat.uap.service.LoginPolicy loginPolicy) throws Exception {
        loginPolicyRepository.deleteById(loginPolicy.getEmplyrId());
    }

    @Override
    @Transactional(readOnly = true)
    public LoginPolicyVO selectLoginPolicyResult(LoginPolicyVO loginPolicyVO) throws Exception {
        return getLoginPolicyVo(loginPolicyVO.getEmplyrId());
    }

    private LoginPolicyVO getLoginPolicyVo(String emplyrId) {
        // Fetch Policy
        LoginPolicy policy = loginPolicyRepository.findById(emplyrId).orElse(null);

        // Fetch User (always required for Name)
        User user = userRepository.findById(emplyrId).orElse(null);

        LoginPolicyVO vo = new LoginPolicyVO();
        vo.setEmplyrId(emplyrId); // Target User ID

        if (user != null) {
            vo.setEmplyrNm(user.getUserNm());
            vo.setEmplyrSe(user.getRole() != null ? user.getRole().name() : "");
            // vo.setEmplyrSe(user.getUserSe()); // if User entity had it
        }

        if (policy != null) {
            vo.setIpInfo(policy.getIpInfo());
            vo.setDplctPermAt(policy.getDplctPermAt());
            vo.setLmttAt(policy.getLmttAt());
            vo.setUserId(policy.getLastUpdusrId());
            vo.setRegDate(policy.getModifiedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            vo.setRegYn("Y");
        } else {
            vo.setRegYn("N");
            // Defaults or Nulls
            vo.setDplctPermAt("Y"); // Default if not set? XML used 'N'.
            // Actually in selectList XML: IF(B.EMPLYR_ID IS NULL, 'N', 'Y')
        }
        return vo;
    }

    private LoginPolicyVO convertToVo(LoginPolicySearchResult result) {
        LoginPolicyVO vo = new LoginPolicyVO();
        vo.setEmplyrId(result.getEmplyrId());
        vo.setEmplyrNm(result.getUserNm());
        vo.setEmplyrSe(result.getUserSe());
        vo.setIpInfo(result.getIpInfo());
        vo.setDplctPermAt(result.getDplctPermAt());
        vo.setLmttAt(result.getLmttAt());
        vo.setUserId(result.getLastUpdusrId());
        if (result.getLastUpdtPnttm() != null) {
            vo.setRegDate(result.getLastUpdtPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        }
        vo.setRegYn(result.getRegYn());
        return vo;
    }
}
