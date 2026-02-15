package egovframework.com.uat.uia.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.user.EnterpriseUser;
import com.company.project.domain.user.EnterpriseUserRepository;
import com.company.project.domain.user.GeneralUser;
import com.company.project.domain.user.GeneralUserRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;

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
 * 일반 로그인, 인증서 로그인을 처리하는 비즈니스 구현 클래스
 * 
 * @author 공통서비스 개발팀 박지욱
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

	@org.springframework.beans.factory.annotation.Autowired(required = false)
	private EgovSndngMailRegistService sndngMailRegistService;

	@Resource(name = "egovLoginConfig")
	EgovLoginConfig egovLoginConfig;

	/**
	 * EsntlId를 이용한 로그인을 처리한다
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
					.filter(u -> u.getRole() != null) // Role 체크를 상태 체크로 갈음
					.map(this::toVO).orElse(null);
		}

		return resultVO != null ? resultVO : new LoginVO();
	}

	/**
	 * 일반 로그인을 처리한다
	 */
	@Override
	public LoginVO actionLogin(LoginVO vo) throws Exception {
		String enpassword = EgovFileScrty.encryptPassword(vo.getPassword(), vo.getId());
		LoginVO resultVO = null;

		if ("GNR".equals(vo.getUserSe())) {
			resultVO = generalUserRepository.findByMberId(vo.getId())
					.filter(u -> u.getPassword().equals(enpassword) && "P".equals(u.getMberSttus()))
					.map(this::toVO).orElse(null);
		} else if ("ENT".equals(vo.getUserSe())) {
			resultVO = enterpriseUserRepository.findByEntrprsmberId(vo.getId())
					.filter(u -> u.getEntrprsMberPassword().equals(enpassword) && "P".equals(u.getEntrprsMberSttus()))
					.map(this::toVO).orElse(null);
		} else if ("USR".equals(vo.getUserSe())) {
			resultVO = userRepository.findById(vo.getId())
					.filter(u -> u.getPassword().equals(enpassword))
					.map(this::toVO).orElse(null);
		}

		return resultVO != null ? resultVO : new LoginVO();
	}

	/**
	 * 인증서 로그인을 처리한다
	 */
	@Override
	public LoginVO actionCrtfctLogin(LoginVO vo) throws Exception {
		// NEMPLYRINFO 테이블의 CRTFC_DN_VALUE(subDn)로 조회 (업무사용자 기준)
		return userRepository.findBySubDn(vo.getDn())
				.map(this::toVO).orElse(new LoginVO());
	}

	/**
	 * 아이디를 찾는다.
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
	 * 비밀번호를 찾는다.
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

		// 임시 비밀번호 생성 및 저장
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
			mailVO.setSj("[MOIS] 임시 비밀번호를 발송했습니다.");
			mailVO.setEmailCn("고객님의 임시 비밀번호는 " + password + " 입니다.");
			sndngMailRegistService.insertSndngMail(mailVO);
		}
	}

	@Override
	public Map<String, Object> selectLoginIncorrect(LoginVO vo) throws Exception {
		Map<String, Object> map = new HashMap<>();
		if ("GNR".equals(vo.getUserSe())) {
			generalUserRepository.findByMberId(vo.getId()).ifPresent(u -> {
				map.put("lockAt", u.getLockAt());
				map.put("lockCnt", 0); // GeneralUser 엔티티에 lockCnt가 없는 경우 0 기본값
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
		// 엔티티에 직접 lock 로직 구현 필요 (간략화)
		if ("USR".equals(vo.getUserSe()))
			userRepository.findById(vo.getId()).ifPresent(u -> {
				// User 엔티티에는 lock 처리 로직이 이미 있을 수 있음
			});
	}

	private void increaseLockCount(LoginVO vo) {
		// 엔티티에 직접 로직 구현 필요
	}

	@Override
	public int selectPassedDayChangePWD(LoginVO vo) throws Exception {
		// 엔티티의 chgPwdLastPnttm 기반 계산 필요
		return 0; // 구현 생략 또는 엔티티 메서드 호출
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
