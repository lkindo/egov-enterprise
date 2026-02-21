package egovframework.com.uss.umt.service.impl;

import egovframework.com.uss.umt.service.EgovUserManageService;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.uss.umt.service.UserManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.domain.user.repository.GeneralUserRepository;
import com.company.project.domain.user.repository.EnterpriseUserRepository;

/**
 * ?????? ???????? ?????? ???.
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
@Service("userManageService")
public class EgovUserManageServiceImpl extends EgovAbstractServiceImpl implements EgovUserManageService {

	@Resource(name = "userRepository")
	private UserRepository userRepository;

	@Resource(name = "generalUserRepository")
	private GeneralUserRepository generalUserRepository;

	@Resource(name = "enterpriseUserDomainRepository")
	private EnterpriseUserRepository enterpriseUserRepository;

	@Resource(name = "egovUsrCnfrmIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public int checkIdDplct(String checkId) {
		int count = 0;
		if (userRepository.existsById(checkId))
			count++;
		if (generalUserRepository.findByMberId(checkId).isPresent())
			count++;
		if (enterpriseUserRepository.findByEntrprsmberId(checkId).isPresent())
			count++;
		return count;
	}

	@Override
	@Transactional
	public void deleteUser(String checkedIdForDel) {
		String safeCheckedId = EgovStringUtil.isNullToString(checkedIdForDel);
		List<String> userIds = new ArrayList<>();
		List<String> generalUserIds = new ArrayList<>();
		List<String> enterpriseUserIds = new ArrayList<>();

		java.util.StringTokenizer st = new java.util.StringTokenizer(safeCheckedId, ",");
		while (st.hasMoreTokens()) {
			String element = st.nextToken();
			int idx = element.indexOf(":");
			if (idx == -1)
				continue;

			String type = element.substring(0, idx);
			int nextIdx = element.indexOf(":", idx + 1);
			String esntlId;
			if (nextIdx == -1) {
				esntlId = element.substring(idx + 1);
			} else {
				esntlId = element.substring(idx + 1, nextIdx);
			}

			if (esntlId.length() == 0)
				continue;

			if ("USR03".equals(type)) { // ???????
				userIds.add(esntlId);
			} else if ("USR01".equals(type)) { // ?????
				generalUserIds.add(esntlId);
			} else if ("USR02".equals(type)) { // ???
				enterpriseUserIds.add(esntlId);
			}
		}

		if (!userIds.isEmpty()) {
			userRepository.deleteAllByIdInBatch(userIds);
		}
		if (!generalUserIds.isEmpty()) {
			generalUserRepository.deleteAllByIdInBatch(generalUserIds);
		}
		if (!enterpriseUserIds.isEmpty()) {
			enterpriseUserRepository.deleteAllByIdInBatch(enterpriseUserIds);
		}
	}

	@Override
	@Transactional
	public String insertUser(UserManageVO userManageVO) throws Exception {
		String uniqId = idgenService.getNextStringId();
		userManageVO.setUniqId(uniqId);

		String pass = EgovFileScrty.encryptPassword(userManageVO.getPassword(),
				EgovStringUtil.isNullToString(userManageVO.getEmplyrId()));
		userManageVO.setPassword(pass);

		User user = toEntity(userManageVO);
		userRepository.save(user);
		return uniqId;
	}

	@Override
	public UserManageVO selectUser(String uniqId) {
		return userRepository.findByEsntlId(uniqId)
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public List<EgovMap> selectUserList(UserDefaultVO userSearchVO) {
		Pageable pageable = PageRequest.of(userSearchVO.getPageIndex() - 1, userSearchVO.getPageUnit());
		Page<User> page = userRepository.searchUsers(
				userSearchVO.getSbscrbSttus(),
				userSearchVO.getSearchCondition(),
				userSearchVO.getSearchKeyword(),
				pageable);

		return page.getContent().stream()
				.map(u -> {
					EgovMap map = new EgovMap();
					map.put("uniqId", u.getEsntlId());
					map.put("userTy", "USR03");
					map.put("userId", u.getUserId());
					map.put("userNm", u.getUserNm());
					map.put("emailAdres", u.getEmailAdres());
					map.put("areaNo", u.getAreaNo());
					map.put("middleTelno", u.getHomemiddleTelno());
					map.put("endTelno", u.getHomeendTelno());
					map.put("moblphonNo", u.getMoblphonNo());
					map.put("groupId", u.getGroupId());
					map.put("sttus", u.getRole() != null ? u.getRole().toString() : "");
					map.put("sbscrbDe", u.getSbscrbDe() != null ? u.getSbscrbDe().toString() : "");
					return map;
				})
				.collect(Collectors.toList());
	}

	@Override
	public int selectUserListTotCnt(UserDefaultVO userSearchVO) {
		Pageable pageable = PageRequest.of(0, 1);
		Page<User> page = userRepository.searchUsers(
				userSearchVO.getSbscrbSttus(),
				userSearchVO.getSearchCondition(),
				userSearchVO.getSearchKeyword(),
				pageable);
		return (int) page.getTotalElements();
	}

	@Override
	@Transactional
	public void updateUser(UserManageVO userManageVO) throws Exception {
		String pass = EgovFileScrty.encryptPassword(userManageVO.getPassword(),
				EgovStringUtil.isNullToString(userManageVO.getEmplyrId()));
		userManageVO.setPassword(pass);

		userRepository.findByEsntlId(userManageVO.getUniqId()).ifPresent(user -> {
			user.update(
					userManageVO.getEmplyrNm(),
					userManageVO.getPasswordHint(),
					userManageVO.getPasswordCnsr(),
					userManageVO.getEmplNo(),
					userManageVO.getIhidnum(),
					userManageVO.getSexdstnCode(),
					userManageVO.getBrth(),
					userManageVO.getAreaNo(),
					userManageVO.getHomemiddleTelno(),
					userManageVO.getHomeendTelno(),
					userManageVO.getFxnum(),
					userManageVO.getHomeadres(),
					userManageVO.getDetailAdres(),
					userManageVO.getZip(),
					userManageVO.getOffmTelno(),
					userManageVO.getMoblphonNo(),
					userManageVO.getEmailAdres(),
					userManageVO.getOfcpsNm(),
					userManageVO.getGroupId(),
					userManageVO.getOrgnztId(),
					userManageVO.getInsttCode(),
					userManageVO.getEmplyrSttusCode() != null ? parseRole(userManageVO.getEmplyrSttusCode())
							: Role.USER,
					userManageVO.getSubDn());
		});
	}

	private Role parseRole(String code) {
		try {
			return Role.valueOf(code);
		} catch (IllegalArgumentException e) {
			return Role.USER;
		}
	}

	@Override
	public String insertUserHistory(UserManageVO userManageVO) {
		return "";
	}

	@Override
	@Transactional
	public void updatePassword(UserManageVO userManageVO) {
		userRepository.findByEsntlId(userManageVO.getUniqId()).ifPresent(user -> {
			user.updatePassword(userManageVO.getPassword());
		});
	}

	@Override
	public UserManageVO selectPassword(UserManageVO passVO) {
		return userRepository.findByEsntlId(passVO.getUniqId())
				.map(u -> {
					UserManageVO vo = new UserManageVO();
					vo.setPassword(u.getPassword());
					return vo;
				})
				.orElse(null);
	}

	@Override
	@Transactional
	public void updateLockIncorrect(UserManageVO userManageVO) {
		userRepository.findByEsntlId(userManageVO.getUniqId()).ifPresent(user -> {
			user.unlock();
		});
	}

	private UserManageVO toVO(User user) {
		UserManageVO vo = new UserManageVO();
		vo.setUniqId(user.getEsntlId());
		vo.setEmplyrId(user.getUserId());
		vo.setEmplyrNm(user.getUserNm());
		vo.setPassword(user.getPassword());
		vo.setPasswordHint(user.getPasswordHint());
		vo.setPasswordCnsr(user.getPasswordCnsr());
		vo.setEmplNo(user.getEmplNo());
		vo.setIhidnum(user.getIhidnum());
		vo.setSexdstnCode(user.getSexdstnCode());
		vo.setBrth(user.getBrth());
		vo.setAreaNo(user.getAreaNo());
		vo.setHomemiddleTelno(user.getHomemiddleTelno());
		vo.setHomeendTelno(user.getHomeendTelno());
		vo.setFxnum(user.getFxnum());
		vo.setHomeadres(user.getHomeadres());
		vo.setDetailAdres(user.getDetailAdres());
		vo.setZip(user.getZip());
		vo.setOffmTelno(user.getOffmTelno());
		vo.setMoblphonNo(user.getMoblphonNo());
		vo.setEmailAdres(user.getEmailAdres());
		vo.setOfcpsNm(user.getOfcpsNm());
		vo.setGroupId(user.getGroupId());
		vo.setOrgnztId(user.getOrgnztId());
		vo.setInsttCode(user.getInsttCode());
		vo.setEmplyrSttusCode(user.getRole() != null ? user.getRole().name() : "");
		vo.setSbscrbDe(user.getSbscrbDe() != null ? user.getSbscrbDe().toString() : "");
		vo.setSubDn(user.getSubDn());
		vo.setLockAt(user.getLockAt());
		return vo;
	}

	private User toEntity(UserManageVO vo) {
		return User.builder()
				.userId(vo.getEmplyrId())
				.esntlId(vo.getUniqId())
				.userNm(vo.getEmplyrNm())
				.password(vo.getPassword())
				.passwordHint(vo.getPasswordHint())
				.passwordCnsr(vo.getPasswordCnsr())
				.emplNo(vo.getEmplNo())
				.ihidnum(vo.getIhidnum())
				.sexdstnCode(vo.getSexdstnCode())
				.brth(vo.getBrth())
				.areaNo(vo.getAreaNo())
				.homemiddleTelno(vo.getHomemiddleTelno())
				.homeendTelno(vo.getHomeendTelno())
				.fxnum(vo.getFxnum())
				.homeadres(vo.getHomeadres())
				.detailAdres(vo.getDetailAdres())
				.zip(vo.getZip())
				.offmTelno(vo.getOffmTelno())
				.moblphonNo(vo.getMoblphonNo())
				.emailAdres(vo.getEmailAdres())
				.ofcpsNm(vo.getOfcpsNm())
				.groupId(vo.getGroupId())
				.orgnztId(vo.getOrgnztId())
				.insttCode(vo.getInsttCode())
				.role(vo.getEmplyrSttusCode() != null ? parseRole(vo.getEmplyrSttusCode()) : Role.USER)
				.subDn(vo.getSubDn())
				.build();
	}
}
