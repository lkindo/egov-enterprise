package egovframework.com.uss.umt.service.impl;

import egovframework.com.uss.umt.service.EgovMberManageService;
import egovframework.com.uss.umt.service.MberManageVO;
import egovframework.com.uss.umt.service.StplatVO;
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

import com.company.project.domain.user.GeneralUser;
import com.company.project.domain.user.GeneralUserRepository;
import com.company.project.domain.user.TermsInfo;
import com.company.project.domain.user.TermsRepository;
import com.company.project.domain.user.UserRepository;
import com.company.project.domain.user.EnterpriseUserRepository;

/**
 * 일반회원관리에 관한비지니스클래스를 정의한다.
 * 
 * @author 공통서비스 개발팀 조재영
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.04.10  조재영          최초 생성
 *   2014.12.08	 이기하			암호화방식 변경(EgovFileScrty.encryptPassword)
 *   2017.07.21  장동한 			로그인인증제한 작업
 *
 *      </pre>
 */
@Service("mberManageService")
public class EgovMberManageServiceImpl extends EgovAbstractServiceImpl implements EgovMberManageService {

	@Resource(name = "generalUserRepository")
	private GeneralUserRepository generalUserRepository;

	@Resource(name = "userRepository")
	private UserRepository userRepository;

	@Resource(name = "enterpriseUserRepository")
	private EnterpriseUserRepository enterpriseUserRepository;

	@Resource(name = "userTermsRepository")
	private TermsRepository termsRepository;

	@Resource(name = "egovUsrCnfrmIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	@Transactional
	public String insertMber(MberManageVO mberManageVO) throws Exception {
		String uniqId = idgenService.getNextStringId();
		mberManageVO.setUniqId(uniqId);

		String pass = EgovFileScrty.encryptPassword(mberManageVO.getPassword(),
				EgovStringUtil.isNullToString(mberManageVO.getMberId()));
		mberManageVO.setPassword(pass);

		GeneralUser user = toEntity(mberManageVO);
		generalUserRepository.save(user);
		return uniqId;
	}

	@Override
	public MberManageVO selectMber(String uniqId) {
		return generalUserRepository.findById(uniqId)
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public List<MberManageVO> selectMberList(UserDefaultVO userSearchVO) {
		Pageable pageable = PageRequest.of(userSearchVO.getPageIndex() - 1, userSearchVO.getPageUnit());
		Page<GeneralUser> page = generalUserRepository.searchGeneralUsers(
				userSearchVO.getSbscrbSttus(),
				userSearchVO.getSearchCondition(),
				userSearchVO.getSearchKeyword(),
				pageable);

		return page.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectMberListTotCnt(UserDefaultVO userSearchVO) {
		Pageable pageable = PageRequest.of(0, 1);
		Page<GeneralUser> page = generalUserRepository.searchGeneralUsers(
				userSearchVO.getSbscrbSttus(),
				userSearchVO.getSearchCondition(),
				userSearchVO.getSearchKeyword(),
				pageable);
		return (int) page.getTotalElements();
	}

	@Override
	@Transactional
	public void updateMber(MberManageVO mberManageVO) throws Exception {
		String pass = EgovFileScrty.encryptPassword(mberManageVO.getPassword(),
				EgovStringUtil.isNullToString(mberManageVO.getMberId()));
		mberManageVO.setPassword(pass);

		generalUserRepository.findById(mberManageVO.getUniqId()).ifPresent(user -> {
			user.update(
					mberManageVO.getMberNm(),
					mberManageVO.getPasswordHint(),
					mberManageVO.getPasswordCnsr(),
					mberManageVO.getIhidnum(),
					mberManageVO.getSexdstnCode(),
					mberManageVO.getZip(),
					mberManageVO.getAdres(),
					mberManageVO.getAreaNo(),
					mberManageVO.getMberSttus(),
					mberManageVO.getDetailAdres(),
					mberManageVO.getEndTelno(),
					mberManageVO.getMoblphonNo(),
					mberManageVO.getGroupId(),
					mberManageVO.getMberFxnum(),
					mberManageVO.getMberEmailAdres(),
					mberManageVO.getMiddleTelno());
		});
	}

	@Override
	@Transactional
	public void deleteMber(String checkedIdForDel) {
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
	public List<StplatVO> selectStplat(String stplatId) {
		return termsRepository.findById(stplatId)
				.map(t -> {
					StplatVO vo = new StplatVO();
					vo.setUseStplatId(t.getUseStplatId());
					vo.setUseStplatCn(t.getUseStplatCn());
					vo.setInfoProvdAgeCn(t.getInfoProvdAgreCn());
					return List.of(vo);
				})
				.orElse(List.of());
	}

	@Override
	@Transactional
	public void updatePassword(MberManageVO mberManageVO) {
		generalUserRepository.findById(mberManageVO.getUniqId()).ifPresent(user -> {
			user.updatePassword(mberManageVO.getPassword());
		});
	}

	@Override
	public MberManageVO selectPassword(MberManageVO passVO) {
		return generalUserRepository.findById(passVO.getUniqId())
				.map(u -> {
					MberManageVO vo = new MberManageVO();
					vo.setPassword(u.getPassword());
					return vo;
				})
				.orElse(null);
	}

	@Override
	@Transactional
	public void updateLockIncorrect(MberManageVO mberManageVO) {
		generalUserRepository.findById(mberManageVO.getUniqId()).ifPresent(GeneralUser::unlock);
	}

	private MberManageVO toVO(GeneralUser user) {
		MberManageVO vo = new MberManageVO();
		vo.setUniqId(user.getEsntlId());
		vo.setMberId(user.getMberId());
		vo.setMberNm(user.getMberNm());
		vo.setPassword(user.getPassword());
		vo.setPasswordHint(user.getPasswordHint());
		vo.setPasswordCnsr(user.getPasswordCnsr());
		vo.setIhidnum(user.getIhidnum());
		vo.setSexdstnCode(user.getSexdstnCode());
		vo.setZip(user.getZip());
		vo.setAdres(user.getAdres());
		vo.setAreaNo(user.getAreaNo());
		vo.setMberSttus(user.getMberSttus());
		vo.setDetailAdres(user.getDetailAdres());
		vo.setEndTelno(user.getEndTelno());
		vo.setMoblphonNo(user.getMoblphonNo());
		vo.setGroupId(user.getGroupId());
		vo.setMberFxnum(user.getMberFxnum());
		vo.setMberEmailAdres(user.getMberEmailAdres());
		vo.setMiddleTelno(user.getMiddleTelno());
		vo.setSbscrbDe(user.getSbscrbDe() != null ? user.getSbscrbDe().toString() : "");
		vo.setLockAt(user.getLockAt());
		return vo;
	}

	private GeneralUser toEntity(MberManageVO vo) {
		return GeneralUser.builder()
				.esntlId(vo.getUniqId())
				.mberId(vo.getMberId())
				.mberNm(vo.getMberNm())
				.password(vo.getPassword())
				.passwordHint(vo.getPasswordHint())
				.passwordCnsr(vo.getPasswordCnsr())
				.ihidnum(vo.getIhidnum())
				.sexdstnCode(vo.getSexdstnCode())
				.zip(vo.getZip())
				.adres(vo.getAdres())
				.areaNo(vo.getAreaNo())
				.mberSttus(vo.getMberSttus())
				.detailAdres(vo.getDetailAdres())
				.endTelno(vo.getEndTelno())
				.moblphonNo(vo.getMoblphonNo())
				.groupId(vo.getGroupId())
				.mberFxnum(vo.getMberFxnum())
				.mberEmailAdres(vo.getMberEmailAdres())
				.middleTelno(vo.getMiddleTelno())
				.lockAt(vo.getLockAt())
				.build();
	}
}
