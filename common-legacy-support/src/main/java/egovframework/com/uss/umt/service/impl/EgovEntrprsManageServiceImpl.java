package egovframework.com.uss.umt.service.impl;

import egovframework.com.uss.umt.service.EgovEntrprsManageService;
import egovframework.com.uss.umt.service.EntrprsManageVO;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import com.company.project.domain.user.entity.EnterpriseUser;
import com.company.project.domain.user.repository.EnterpriseUserRepository;
import com.company.project.domain.user.repository.GeneralUserRepository;
import com.company.project.domain.user.repository.UserRepository;

/**
 * ????? ?????????????? ???.
 * 
 * @author ???????? ???
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.10  ???         ????
 *   2014.12.08	 ????		??????EgovFileScrty.encryptPassword)
 *   2017.07.21  ???			??????
 *
 *      </pre>
 **/
@Service("entrprsManageService")
public class EgovEntrprsManageServiceImpl extends EgovAbstractServiceImpl implements EgovEntrprsManageService {

	@Resource(name = "enterpriseUserDomainRepository")
	private EnterpriseUserRepository enterpriseUserRepository;

	@Resource(name = "userRepository")
	private UserRepository userRepository;

	@Resource(name = "generalUserRepository")
	private GeneralUserRepository generalUserRepository;

	@Resource(name = "egovUsrCnfrmIdGnrService")
	private EgovIdGnrService idgenService;

	@Resource(name = "userTermsRepository")
	private com.company.project.domain.user.repository.TermsRepository termsRepository;

	@Override
	@Transactional(readOnly = true)
	public List<egovframework.com.uss.umt.service.StplatVO> selectStplat(String stplatId) {
		return termsRepository.findById(stplatId)
				.map(t -> {
					egovframework.com.uss.umt.service.StplatVO vo = new egovframework.com.uss.umt.service.StplatVO();
					vo.setUseStplatId(t.getUseStplatId());
					vo.setUseStplatCn(t.getUseStplatCn());
					vo.setInfoProvdAgeCn(t.getInfoProvdAgreCn());
					return List.of(vo);
				})
				.orElse(List.of());
	}

	@Override
	@Transactional
	public String insertEntrprsmber(EntrprsManageVO entrprsManageVO) throws Exception {
		String uniqId = idgenService.getNextStringId();
		entrprsManageVO.setUniqId(uniqId);

		String pass = EgovFileScrty.encryptPassword(entrprsManageVO.getEntrprsMberPassword(),
				EgovStringUtil.isNullToString(entrprsManageVO.getEntrprsmberId()));
		entrprsManageVO.setEntrprsMberPassword(pass);

		EnterpriseUser user = toEntity(entrprsManageVO);
		enterpriseUserRepository.save(user);
		return uniqId;
	}

	@Override
	@Transactional(readOnly = true)
	public EntrprsManageVO selectEntrprsmber(String uniqId) {
		return enterpriseUserRepository.findByEsntlId(uniqId)
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	@Transactional(readOnly = true)
	public List<EntrprsManageVO> selectEntrprsMberList(UserDefaultVO userSearchVO) {
		Pageable pageable = PageRequest.of(userSearchVO.getPageIndex() - 1, userSearchVO.getPageUnit());
		Page<EnterpriseUser> page = enterpriseUserRepository.searchEnterpriseUsers(
				userSearchVO.getSbscrbSttus(),
				userSearchVO.getSearchCondition(),
				userSearchVO.getSearchKeyword(),
				pageable);

		return page.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	@Transactional(readOnly = true)
	public int selectEntrprsMberListTotCnt(UserDefaultVO userSearchVO) {
		Pageable pageable = PageRequest.of(0, 1);
		Page<EnterpriseUser> page = enterpriseUserRepository.searchEnterpriseUsers(
				userSearchVO.getSbscrbSttus(),
				userSearchVO.getSearchCondition(),
				userSearchVO.getSearchKeyword(),
				pageable);
		return (int) page.getTotalElements();
	}

	@Override
	@Transactional
	public void updateEntrprsmber(EntrprsManageVO entrprsManageVO) throws Exception {
		String pass = EgovFileScrty.encryptPassword(entrprsManageVO.getEntrprsMberPassword(),
				EgovStringUtil.isNullToString(entrprsManageVO.getEntrprsmberId()));
		entrprsManageVO.setEntrprsMberPassword(pass);

		enterpriseUserRepository.findByEsntlId(entrprsManageVO.getUniqId()).ifPresent(user -> {
			user.update(
					entrprsManageVO.getEntrprsmberId(),
					entrprsManageVO.getEntrprsSeCode(),
					entrprsManageVO.getBizrno(),
					entrprsManageVO.getJurirno(),
					entrprsManageVO.getCmpnyNm(),
					entrprsManageVO.getCxfc(),
					entrprsManageVO.getZip(),
					entrprsManageVO.getAdres(),
					entrprsManageVO.getEntrprsMiddleTelno(),
					entrprsManageVO.getFxnum(),
					entrprsManageVO.getIndutyCode(),
					entrprsManageVO.getApplcntNm(),
					entrprsManageVO.getEntrprsMberSttus(),
					entrprsManageVO.getEntrprsMberPasswordHint(),
					entrprsManageVO.getEntrprsMberPasswordCnsr(),
					entrprsManageVO.getGroupId(),
					entrprsManageVO.getDetailAdres(),
					entrprsManageVO.getEntrprsEndTelno(),
					entrprsManageVO.getAreaNo(),
					entrprsManageVO.getApplcntEmailAdres());
		});
	}

	@Override
	@Transactional
	public void deleteEntrprsmber(String checkedIdForDel) {
		String[] delId = checkedIdForDel.split(",");
		for (String element : delId) {
			String[] id = element.split(":");
			if (id.length < 2)
				continue;
			String type = id[0];
			String esntlId = id[1];

			if ("USR03".equals(type)) {
				userRepository.deleteById(esntlId);
			} else if ("USR01".equals(type)) {
				generalUserRepository.deleteById(esntlId);
			} else if ("USR02".equals(type)) {
				enterpriseUserRepository.deleteById(esntlId);
			}
		}
	}

	@Override
	@Transactional
	public void updatePassword(EntrprsManageVO entrprsManageVO) {
		enterpriseUserRepository.findByEsntlId(entrprsManageVO.getUniqId()).ifPresent(user -> {
			user.updatePassword(entrprsManageVO.getEntrprsMberPassword());
		});
	}

	@Override
	@Transactional(readOnly = true)
	public EntrprsManageVO selectPassword(EntrprsManageVO passVO) {
		return enterpriseUserRepository.findByEsntlId(passVO.getUniqId())
				.map(u -> {
					EntrprsManageVO vo = new EntrprsManageVO();
					vo.setEntrprsMberPassword(u.getEntrprsMberPassword());
					return vo;
				})
				.orElse(null);
	}

	@Override
	@Transactional
	public void updateLockIncorrect(EntrprsManageVO entrprsManageVO) {
		enterpriseUserRepository.findByEsntlId(entrprsManageVO.getUniqId()).ifPresent(EnterpriseUser::unlock);
	}

	private EntrprsManageVO toVO(EnterpriseUser user) {
		EntrprsManageVO vo = new EntrprsManageVO();
		vo.setUniqId(user.getEsntlId());
		vo.setEntrprsmberId(user.getEntrprsmberId());
		vo.setEntrprsSeCode(user.getEntrprsSeCode());
		vo.setBizrno(user.getBizrno());
		vo.setJurirno(user.getJurirno());
		vo.setCmpnyNm(user.getCmpnyNm());
		vo.setCxfc(user.getCxfc());
		vo.setZip(user.getZip());
		vo.setAdres(user.getAdres());
		vo.setEntrprsMiddleTelno(user.getEntrprsMiddleTelno());
		vo.setFxnum(user.getFxnum());
		vo.setIndutyCode(user.getIndutyCode());
		vo.setApplcntNm(user.getApplcntNm());
		vo.setSbscrbDe(user.getSbscrbDe() != null ? user.getSbscrbDe().toString() : "");
		vo.setEntrprsMberSttus(user.getEntrprsMberSttus());
		vo.setEntrprsMberPassword(user.getEntrprsMberPassword());
		vo.setEntrprsMberPasswordHint(user.getEntrprsMberPasswordHint());
		vo.setEntrprsMberPasswordCnsr(user.getEntrprsMberPasswordCnsr());
		vo.setGroupId(user.getGroupId());
		vo.setDetailAdres(user.getDetailAdres());
		vo.setEntrprsEndTelno(user.getEntrprsEndTelno());
		vo.setAreaNo(user.getAreaNo());
		vo.setApplcntEmailAdres(user.getApplcntEmailAdres());
		vo.setApplcntIhidnum(user.getApplcntIhidnum());
		vo.setLockAt(user.getLockAt());
		vo.setUserTy("USR02");
		return vo;
	}

	private EnterpriseUser toEntity(EntrprsManageVO vo) {
		return EnterpriseUser.builder()
				.esntlId(vo.getUniqId())
				.entrprsmberId(vo.getEntrprsmberId())
				.entrprsSeCode(vo.getEntrprsSeCode())
				.bizrno(vo.getBizrno())
				.jurirno(vo.getJurirno())
				.cmpnyNm(vo.getCmpnyNm())
				.cxfc(vo.getCxfc())
				.zip(vo.getZip())
				.adres(vo.getAdres())
				.entrprsMiddleTelno(vo.getEntrprsMiddleTelno())
				.fxnum(vo.getFxnum())
				.indutyCode(vo.getIndutyCode())
				.applcntNm(vo.getApplcntNm())
				.entrprsMberSttus(vo.getEntrprsMberSttus())
				.entrprsMberPassword(vo.getEntrprsMberPassword())
				.entrprsMberPasswordHint(vo.getEntrprsMberPasswordHint())
				.entrprsMberPasswordCnsr(vo.getEntrprsMberPasswordCnsr())
				.groupId(vo.getGroupId())
				.detailAdres(vo.getDetailAdres())
				.entrprsEndTelno(vo.getEntrprsEndTelno())
				.areaNo(vo.getAreaNo())
				.applcntEmailAdres(vo.getApplcntEmailAdres())
				.applcntIhidnum(vo.getApplcntIhidnum())
				.lockAt(vo.getLockAt())
				.build();
	}
}
