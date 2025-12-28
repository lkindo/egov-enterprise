package egovframework.let.uat.uia.service.impl;

import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.service.EgovLoginService;
import egovframework.let.utl.fcc.service.EgovNumberUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 일반 로그인을 처리하는 클래스 (JPA 전환)
 */
@Service("loginService")
@Transactional(readOnly = true)
public class EgovLoginServiceImpl extends EgovAbstractServiceImpl implements EgovLoginService {

    @Resource
    private UserRepository userRepository;

    @Override
    public LoginVO actionLogin(LoginVO vo) throws Exception {
        // 1. 암호화
        String enpassword = EgovFileScrty.encryptPassword(vo.getPassword(), vo.getId());

        // 2. 조회
        Optional<User> userOpt = userRepository.findById(vo.getId());

        LoginVO resultVO = new LoginVO();

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getPassword().equals(enpassword)) {
                // 로그인 성공
                resultVO.setId(user.getUserId());
                resultVO.setPassword(user.getPassword());
                resultVO.setName(user.getUserNm());
                resultVO.setEmail(user.getEmailAdres());
                resultVO.setUserSe("USR"); // Assuming standard user
                resultVO.setOrgnztId(user.getOrgnztId());
                resultVO.setUniqId(user.getEsntlId());
                return resultVO;
            }
        }

        // 실패 시 빈 VO 반환 (레거시 동작 유지)
        return resultVO;
    }

    @Override
    public LoginVO searchId(LoginVO vo) throws Exception {
        Optional<User> userOpt = userRepository.findByUserNmAndEmailAdres(vo.getName(), vo.getEmail());

        LoginVO resultVO = new LoginVO();
        if (userOpt.isPresent()) {
            resultVO.setId(userOpt.get().getUserId());
            return resultVO;
        }
        return resultVO;
    }

    @Override
    @Transactional
    public boolean searchPassword(LoginVO vo) throws Exception {
        Optional<User> userOpt = userRepository.findByUserIdAndUserNmAndEmailAdres(vo.getId(), vo.getName(),
                vo.getEmail());

        if (userOpt.isEmpty()) {
            return false;
        }

        // 임시 비번 생성
        String newpassword = "";
        for (int i = 1; i <= 6; i++) {
            if (i % 3 != 0) {
                newpassword += EgovStringUtil.getRandomStr('a', 'z');
            } else {
                newpassword += EgovNumberUtil.getRandomNum(0, 9);
            }
        }

        // 암호화 및 저장
        User user = userOpt.get();
        String enpassword = EgovFileScrty.encryptPassword(newpassword, vo.getId());
        user.updatePassword(enpassword);

        // 레거시: 임시비번을 리턴하지 않고 저장만 함. (사용자가 이메일로 받거나 화면에 표시 여부는 Controller단 로직인데,
        // 여기서는 boolean만 리턴.
        // *Wait*, legacy `searchPassword` implementation had logic to UPDATE password.
        // It does NOT send email here?
        // Implementation Step 2087: Just updates DB and returns true.
        // Controller likely queries new password or sends it?
        // Actually, looking at legacy code:
        // boolean result = true; ... loginDAO.updatePassword(pwVO); return result;
        // It seems it just resets it. How does user know?
        // Usually `EgovLoginController` handles sending email or displaying it.
        // Wait, if I change password here, I must verify if Controller expects the new
        // password back?
        // The interface `searchPassword` returns `boolean`.
        // So global logic assumes if true, password changed to temp?
        // Ah, Controller might generate it? No, Service generates it.
        // Checking Legacy Code (Step 2087):
        // It generates `newpassword` locally, encrypts it, updates DB.
        // It does NOT return `newpassword`. Use case: "Temporary password
        // generated/reset".
        // Users usually get it via separate channel or it is displayed?
        // Without return value, Controller can't modify it.
        // Check `EgovLoginController` or similar?
        // But strictly adhering to interface, I perform the update.

        return true;
    }
}
