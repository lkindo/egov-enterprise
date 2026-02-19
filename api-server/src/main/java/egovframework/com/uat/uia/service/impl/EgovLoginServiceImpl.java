package egovframework.com.uat.uia.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.user.entity.EnterpriseUser;
import com.company.project.domain.user.repository.EnterpriseUserRepository;
import com.company.project.domain.user.entity.GeneralUser;
import com.company.project.domain.user.repository.GeneralUserRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.config.EgovLoginConfig;
import egovframework.com.cop.ems.service.EgovSndngMailRegistService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.uat.uia.service.EgovLoginService;
import egovframework.com.utl.fcc.service.EgovNumberUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * ?�반 로그?? ?�증??로그?�을 처리?�는 비즈?�스 구현 ?�래??
 * 
 * @author 공통?�비??개발?� 박�???
 * @since 2009.03.06
 * @version 1.0
 */
@Service("loginService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovLoginServiceImpl extends EgovAbstractServiceImpl implements EgovLoginService {

	private final UserRepository userRepository;
	private final GeneralUserRepository generalUserRepository;
	private final EnterpriseUserRepository enterpriseUserRepository;
	private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

	@org.springframework.beans.factory.annotation.Autowired(required = false)
	private EgovSndngMailRegistService sndngMailRegistService;

	@Resource(name = "egovLoginConfig")
	EgovLoginConfig egovLoginConfig;

	/**
	 * EsntlId�??�용??로그?�을 처리?�다
	 */
	@Override
	public LoginVO actionLoginByEsntlId(LoginVO vo) throws Exception {
		LoginVO resultVO = null;

		if ("GNR".equals(vo.getUserSe())) {
			resultVO = generalUserRepository.findByEsntlId(vo.getUniqId())
					.filter(u -> "P".equals(u.getMberSttus()))
					.map(this::toVO).orElse(null);
		} else if ("ENT".equals(vo.getUserSe())) {
			resultVO = enterpriseUserRepository.findByEsntlId(vo.getUniqId())
					.filter(u -> "P".equals(u.getEntrprsMberSttus()))
					.map(this::toVO).orElse(null);
		} else if ("USR".equals(vo.getUserSe())) {
			resultVO = userRepository.findByEsntlId(vo.getUniqId())
					.filter(u -> u.getRole() != null) // Role 체크�??�태 체크�?갈음
					.map(this::toVO).orElse(null);
		}

		return resultVO != null ? resultVO : new LoginVO();
	}

	/**
	 * ?�반 로그?�을 처리?�다
	 */
	@Override
	@Transactional
	public LoginVO actionLogin(LoginVO vo) throws Exception {
		String rawPassword = vo.getPassword();
		String userId = vo.getId();
		String userSe = vo.getUserSe();

		Optional<?> userOpt = Optional.empty();
		if ("GNR".equals(userSe)) {
			userOpt = generalUserRepository.findByMberId(userId)
					.filter(u -> "P".equals(u.getMberSttus()));
		} else if ("ENT".equals(userSe)) {
			userOpt = enterpriseUserRepository.findByEntrprsmberId(userId)
					.filter(u -> "P".equals(u.getEntrprsMberSttus()));
		} else if ("USR".equals(userSe)) {
			userOpt = userRepository.findById(userId);
		}

		if (userOpt.isPresent()) {
			Object user = userOpt.get();
			String encodedPassword = getEncodedPassword(user);

			boolean match = false;
			boolean needsUpgrade = false;

			// 1. BCrypt 체크 ($2a$ ?�는 {bcrypt} ?�으�??�어 ?�는지 ?�인)
			if (encodedPassword != null
					&& (encodedPassword.startsWith("$2a$") || encodedPassword.startsWith("{bcrypt}"))) {
				String passwordToMatch = encodedPassword.startsWith("{bcrypt}") ? encodedPassword.substring(8)
						: encodedPassword;
				match = passwordEncoder.matches(rawPassword, passwordToMatch);
			} else {
				// 2. Legacy SHA-256 체크
				String legacyEncrypted = EgovFileScrty.encryptPassword(rawPassword, userId);
				if (encodedPassword != null && encodedPassword.equals(legacyEncrypted)) {
					match = true;
					needsUpgrade = true;
				}
			}

			if (match) {
				if (needsUpgrade) {
					String newEncoded = passwordEncoder.encode(rawPassword);
					updateUserPassword(user, newEncoded);
				}
				return toVO(user);
			}
		}

		return new LoginVO();
	}

	private String getEncodedPassword(Object user) {
		if (user instanceof GeneralUser u)
			return u.getPassword();
		if (user instanceof EnterpriseUser u)
			return u.getEntrprsMberPassword();
		if (user instanceof User u)
			return u.getPassword();
		return null;
	}

	private void updateUserPassword(Object user, String encodedPassword) {
		if (user instanceof GeneralUser u)
			u.updatePassword(encodedPassword);
		else if (user instanceof EnterpriseUser u)
			u.updatePassword(encodedPassword);
		else if (user instanceof User u)
			u.updatePassword(encodedPassword);
	}

	private LoginVO toVO(Object user) {
		if (user instanceof GeneralUser u)
			return toVO(u);
		if (user instanceof EnterpriseUser u)
			return toVO(u);
		if (user instanceof User u)
			return toVO(u);
		return new LoginVO();
	}

	/**
	 * ?�증??로그?�을 처리?�다
	 */
	@Override
	public LoginVO actionCrtfctLogin(LoginVO vo) throws Exception {
		// NEMPLYRINFO ?�이블의 CRTFC_DN_VALUE(subDn)�?조회 (?�무?�용??기�?)
		return userRepository.findBySubDn(vo.getDn())
				.map(this::toVO).orElse(new LoginVO());
	}

	/**
	 * ?�이?��? 찾는??
	 */
	@Override
	public LoginVO searchId(LoginVO vo) throws Exception {
		LoginVO resultVO = null;

		if ("GNR".equals(vo.getUserSe())) {
			resultVO = generalUserRepository.findByMberNmAndMberEmailAdres(vo.getName(), vo.getEmail())
					.filter(u -> "P".equals(u.getMberSttus()))
					.map(this::toVO).orElse(null);
		} else if ("ENT".equals(vo.getUserSe())) {
			resultVO = enterpriseUserRepository.findByCmpnyNmAndApplcntEmailAdres(vo.getName(), vo.getEmail())
					.filter(u -> "P".equals(u.getEntrprsMberSttus()))
					.map(this::toVO).orElse(null);
		} else if ("USR".equals(vo.getUserSe())) {
			resultVO = userRepository.findByUserNmAndEmailAdres(vo.getName(), vo.getEmail())
					.map(this::toVO).orElse(null);
		}

		return resultVO != null ? resultVO : new LoginVO();
	}

	/**
	 * 비�?번호�?찾는??
	 */
	@Override
	@Transactional
	public boolean searchPassword(LoginVO vo) throws Exception {
		Optional<?> userOpt = Optional.empty();

		if ("GNR".equals(vo.getUserSe())) {
			userOpt = generalUserRepository
					.findByMberIdAndMberNmAndMberEmailAdres(vo.getId(), vo.getName(), vo.getEmail())
					.filter(u -> vo.getPasswordHint().equals(u.getPasswordHint())
							&& vo.getPasswordCnsr().equals(u.getPasswordCnsr()));
		} else if ("ENT".equals(vo.getUserSe())) {
			userOpt = enterpriseUserRepository
					.findByEntrprsmberIdAndCmpnyNmAndApplcntEmailAdres(vo.getId(), vo.getName(), vo.getEmail())
					.filter(u -> vo.getPasswordHint().equals(u.getEntrprsMberPasswordHint())
							&& vo.getPasswordCnsr().equals(u.getEntrprsMberPasswordCnsr()));
		} else if ("USR".equals(vo.getUserSe())) {
			userOpt = userRepository.findByUserIdAndUserNmAndEmailAdres(vo.getId(), vo.getName(), vo.getEmail())
					.filter(u -> vo.getPasswordHint().equals(u.getPasswordHint())
							&& vo.getPasswordCnsr().equals(u.getPasswordCnsr()));
		}

		if (userOpt.isEmpty())
			return false;

		// ?�시 비�?번호 ?�성 �??�??
		String newpassword = generateTemporaryPassword();
		String enpassword = EgovFileScrty.encryptPassword(newpassword, vo.getId());

		if (userOpt.get() instanceof GeneralUser user) {
			user.updatePassword(enpassword);
		} else if (userOpt.get() instanceof EnterpriseUser user) {
			user.updatePassword(enpassword);
		} else if (userOpt.get() instanceof User user) {
			user.updatePassword(enpassword);
		}

		// 메일 발송
		sendTemporaryPasswordMail(vo.getEmail(), newpassword);

		return true;
	}

	private String generateTemporaryPassword() {
		StringBuilder sb = new StringBuilder();
		for (int i = 1; i <= 8; i++) {
			if (i % 3 != 0)
				sb.append(EgovStringUtil.getRandomStr('a', 'z'));
			else
				sb.append(EgovNumberUtil.getRandomNum(0, 9));
		}
		return sb.toString();
	}

	private void sendTemporaryPasswordMail(String email, String password) throws Exception {
		if (sndngMailRegistService != null) {
			SndngMailVO mailVO = new SndngMailVO();
			mailVO.setDsptchPerson("webmaster");
			mailVO.setRecptnPerson(email);
			mailVO.setSj("[MOIS] ?�시 비�?번호�?발송?�습?�다.");
			mailVO.setEmailCn("고객?�의 ?�시 비�?번호??" + password + " ?�니??");
			sndngMailRegistService.insertSndngMail(mailVO);
		}
	}

	@Override
	public Map<String, Object> selectLoginIncorrect(LoginVO vo) throws Exception {
		Map<String, Object> map = new HashMap<>();
		if ("GNR".equals(vo.getUserSe())) {
			generalUserRepository.findByMberId(vo.getId()).ifPresent(u -> {
				map.put("lockAt", u.getLockAt());
				map.put("lockCnt", 0); // GeneralUser ?�티?�에 lockCnt가 ?�는 경우 0 기본�?
				map.put("userPw", u.getPassword());
			});
		} else if ("ENT".equals(vo.getUserSe())) {
			enterpriseUserRepository.findByEntrprsmberId(vo.getId()).ifPresent(u -> {
				map.put("lockAt", u.getLockAt());
				map.put("lockCnt", 0);
				map.put("userPw", u.getEntrprsMberPassword());
			});
		} else if ("USR".equals(vo.getUserSe())) {
			userRepository.findById(vo.getId()).ifPresent(u -> {
				map.put("lockAt", u.getLockAt());
				map.put("lockCnt", u.getLockCnt());
				map.put("userPw", u.getPassword());
			});
		}
		return map;
	}

	@Override
	@Transactional
	public String processLoginIncorrect(LoginVO vo, Map<?, ?> mapLockUserInfo) throws Exception {
		String enpassword = EgovFileScrty.encryptPassword(vo.getPassword(), vo.getId());

		boolean isPasswordMatch = enpassword.equals(mapLockUserInfo.get("userPw"));

		if ("Y".equals(mapLockUserInfo.get("lockAt"))) {
			return "L";
		}

		if (isPasswordMatch) {
			unlockUser(vo);
			return "E";
		} else {
			int lockCnt = Integer.parseInt(String.valueOf(mapLockUserInfo.get("lockCnt")));
			if (lockCnt + 1 >= egovLoginConfig.getLockCount()) {
				lockUser(vo);
				return "L";
			} else {
				increaseLockCount(vo);
				return "C";
			}
		}
	}

	private void unlockUser(LoginVO vo) {
		if ("GNR".equals(vo.getUserSe()))
			generalUserRepository.findByMberId(vo.getId()).ifPresent(GeneralUser::unlock);
		else if ("ENT".equals(vo.getUserSe()))
			enterpriseUserRepository.findByEntrprsmberId(vo.getId()).ifPresent(EnterpriseUser::unlock);
		else if ("USR".equals(vo.getUserSe()))
			userRepository.findById(vo.getId()).ifPresent(User::unlock);
	}

	private void lockUser(LoginVO vo) {
		// ?�티?�에 직접 lock 로직 구현 ?�요 (간략??
		if ("USR".equals(vo.getUserSe()))
			userRepository.findById(vo.getId()).ifPresent(u -> {
				// User ?�티?�에??lock 처리 로직???��? ?�을 ???�음
			});
	}

	private void increaseLockCount(LoginVO vo) {
		// ?�티?�에 직접 로직 구현 ?�요
	}

	@Override
	public int selectPassedDayChangePWD(LoginVO vo) throws Exception {
		// ?�티?�의 chgPwdLastPnttm 기반 계산 ?�요
		return 0; // 구현 ?�략 ?�는 ?�티??메서???�출
	}

	@Override
	public LoginVO onepassLogin(String id) throws Exception {
		return generalUserRepository.findByMberId(id).map(this::toVO)
				.orElseGet(() -> enterpriseUserRepository.findByEntrprsmberId(id).map(this::toVO)
						.orElseGet(() -> userRepository.findById(id).map(this::toVO).orElse(new LoginVO())));
	}

	private LoginVO toVO(GeneralUser entity) {
		LoginVO vo = new LoginVO();
		vo.setId(entity.getMberId());
		vo.setName(entity.getMberNm());
		vo.setUniqId(entity.getEsntlId());
		vo.setEmail(entity.getMberEmailAdres());
		vo.setPassword(entity.getPassword());
		vo.setUserSe("GNR");
		return vo;
	}

	private LoginVO toVO(EnterpriseUser entity) {
		LoginVO vo = new LoginVO();
		vo.setId(entity.getEntrprsmberId());
		vo.setName(entity.getCmpnyNm());
		vo.setUniqId(entity.getEsntlId());
		vo.setEmail(entity.getApplcntEmailAdres());
		vo.setPassword(entity.getEntrprsMberPassword());
		vo.setUserSe("ENT");
		return vo;
	}

	private LoginVO toVO(User entity) {
		LoginVO vo = new LoginVO();
		vo.setId(entity.getUserId());
		vo.setName(entity.getUserNm());
		vo.setUniqId(entity.getEsntlId());
		vo.setEmail(entity.getEmailAdres());
		vo.setPassword(entity.getPassword());
		vo.setUserSe("USR");
		vo.setOrgnztId(entity.getOrgnztId());
		return vo;
	}
}
