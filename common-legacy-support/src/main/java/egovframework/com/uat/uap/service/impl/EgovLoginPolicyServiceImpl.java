package egovframework.com.uat.uap.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.login.LoginPolicy;
import com.company.project.domain.login.LoginPolicyRepository;

import egovframework.com.uat.uap.service.EgovLoginPolicyService;
import egovframework.com.uat.uap.service.LoginPolicyVO;
import lombok.RequiredArgsConstructor;

/**
 * ??????????????????
 * 
 * @author ???????? ??
 * @since 2009.08.03
 * @version 1.1
 **/
@Service("egovLoginPolicyService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovLoginPolicyServiceImpl extends EgovAbstractServiceImpl implements EgovLoginPolicyService {

	private final LoginPolicyRepository loginPolicyRepository;

	/**
	 * ????????. (TBD: User ?????QueryDSL ??
	 **/
	@Override
	public List<LoginPolicyVO> selectLoginPolicyList(LoginPolicyVO searchVO) throws Exception {
		return loginPolicyRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage()))
				.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/**
	 * ??????? ???.
	 **/
	@Override
	public int selectLoginPolicyListTotCnt(LoginPolicyVO searchVO) throws Exception {
		return (int) loginPolicyRepository.count();
	}

	/**
	 * ????????????.
	 **/
	@Override
	public LoginPolicyVO selectLoginPolicy(LoginPolicyVO searchVO) throws Exception {
		return loginPolicyRepository.findById(searchVO.getEmplyrId())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * ???????????.
	 **/
	@Override
	@Transactional
	public void insertLoginPolicy(egovframework.com.uat.uap.service.LoginPolicy vo) throws Exception {
		LoginPolicy entity = LoginPolicy.builder()
				.emplyrId(vo.getEmplyrId())
				.ipInfo(vo.getIpInfo())
				.dplctPermAt(vo.getDplctPermAt())
				.lmttAt(vo.getLmttAt())
				.frstRegisterId(vo.getUserId())
				.build();
		loginPolicyRepository.save(entity);
	}

	/**
	 * ??????????????.
	 **/
	@Override
	@Transactional
	public void updateLoginPolicy(egovframework.com.uat.uap.service.LoginPolicy vo) throws Exception {
		loginPolicyRepository.findById(vo.getEmplyrId()).ifPresent(e -> {
			e.update(vo.getIpInfo(), vo.getDplctPermAt(), vo.getLmttAt(), vo.getUserId());
		});
	}

	/**
	 * ???????????????.
	 **/
	@Override
	@Transactional
	public void deleteLoginPolicy(egovframework.com.uat.uap.service.LoginPolicy vo) throws Exception {
		loginPolicyRepository.deleteById(vo.getEmplyrId());
	}

	private LoginPolicyVO toVO(LoginPolicy entity) {
		LoginPolicyVO vo = new LoginPolicyVO();
		vo.setEmplyrId(entity.getEmplyrId());
		vo.setIpInfo(entity.getIpInfo());
		vo.setDplctPermAt(entity.getDplctPermAt());
		vo.setLmttAt(entity.getLmttAt());
		vo.setUserId(entity.getLastUpdusrId());
		// vo.setRegDate(entity.getLastUpdtPnttm().toString()); // ?? ?????????
		vo.setRegYn("Y");
		return vo;
	}
}
