package egovframework.com.uat.uia.service.impl;

import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.config.EgovLoginConfig;
import egovframework.com.cop.ems.service.EgovSndngMailRegistService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.uat.uia.service.EgovLoginService;
import egovframework.com.utl.fcc.service.EgovNumberUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;

/**
 * ?쇰컲 濡쒓렇?? ?몄쬆??濡쒓렇?몄쓣 泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.06
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?띻만??         理쒖큹 ?앹꽦
 *   2009.03.06  諛뺤???         理쒖큹 ?앹꽦
 *   2011.08.26  ?쒖???         EsntlId瑜??댁슜??濡쒓렇??異붽?
 *   2014.12.08  ?닿린??         ?뷀샇?붾갑??蹂寃?EgovFileScrty.encryptPassword)
 *   2017.07.21  ?λ룞??         濡쒓렇?몄씤利앹젣???묒뾽
 *   2020.07.08  ?좎슜??         鍮꾨?踰덊샇瑜??섏젙?쒗썑 寃쎄낵???좎쭨 議고쉶
 *   2021.05.30  ?뺤쭊??         ?붿??몄썝?⑥뒪 ?몄쬆 ?뚯썝 議고쉶
 *   2024.10.29  ?대갚??         遺덊븘???뺣????쒓굅 (mapLockUserInfo.get("lockAt") ), @Override ?쒓린
 *   2025.07.31  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
@Service("loginService")
public class EgovLoginServiceImpl extends EgovAbstractServiceImpl implements EgovLoginService {

	@Resource(name = "loginDAO")
	private LoginDAO loginDAO;

	/** EgovSndngMailRegistService */
	@Resource(name = "sndngMailRegistService")
	private EgovSndngMailRegistService sndngMailRegistService;

	@Resource(name = "egovLoginConfig")
	EgovLoginConfig egovLoginConfig;

	/**
	 * 2011.08.26 EsntlId瑜??댁슜??濡쒓렇?몄쓣 泥섎━?쒕떎
	 * 
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO actionLoginByEsntlId(LoginVO vo) throws Exception {

		LoginVO loginVO = loginDAO.actionLoginByEsntlId(vo);

		// 3. 寃곌낵瑜?由ы꽩?쒕떎.
		if (loginVO != null && !loginVO.getId().equals("") && !loginVO.getPassword().equals("")) {
			return loginVO;
		} else {
			loginVO = new LoginVO();
		}

		return loginVO;
	}

	/**
	 * ?쇰컲 濡쒓렇?몄쓣 泥섎━?쒕떎
	 * 
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO actionLogin(LoginVO vo) throws Exception {

		// 1. ?낅젰??鍮꾨?踰덊샇瑜??뷀샇?뷀븳??
		String enpassword = EgovFileScrty.encryptPassword(vo.getPassword(), vo.getId());
		vo.setPassword(enpassword);

		// 2. ?꾩씠?붿? ?뷀샇?붾맂 鍮꾨?踰덊샇媛 DB? ?쇱튂?섎뒗吏 ?뺤씤?쒕떎.
		LoginVO loginVO = loginDAO.actionLogin(vo);

		// 3. 寃곌낵瑜?由ы꽩?쒕떎.
		if (loginVO != null && !loginVO.getId().equals("") && !loginVO.getPassword().equals("")) {
			return loginVO;
		} else {
			loginVO = new LoginVO();
		}

		return loginVO;
	}

	/**
	 * ?몄쬆??濡쒓렇?몄쓣 泥섎━?쒕떎
	 * 
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO actionCrtfctLogin(LoginVO vo) throws Exception {

		// 1. DN媛믪쑝濡?ID, PW瑜?議고쉶?쒕떎.
		LoginVO loginVO = loginDAO.actionCrtfctLogin(vo);

		// 3. 寃곌낵瑜?由ы꽩?쒕떎.
		if (loginVO != null && !loginVO.getId().equals("") && !loginVO.getPassword().equals("")) {
			return loginVO;
		} else {
			loginVO = new LoginVO();
		}

		return loginVO;
	}

	/**
	 * ?꾩씠?붾? 李얜뒗??
	 * 
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO searchId(LoginVO vo) throws Exception {

		// 1. ?대쫫, ?대찓?쇱＜?뚭? DB? ?쇱튂?섎뒗 ?ъ슜??ID瑜?議고쉶?쒕떎.
		LoginVO loginVO = loginDAO.searchId(vo);

		// 2. 寃곌낵瑜?由ы꽩?쒕떎.
		if (loginVO != null && !loginVO.getId().equals("")) {
			return loginVO;
		} else {
			loginVO = new LoginVO();
		}

		return loginVO;
	}

	/**
	 * 鍮꾨?踰덊샇瑜?李얜뒗??
	 * 
	 * @param vo LoginVO
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	public boolean searchPassword(LoginVO vo) throws Exception {

		boolean result = true;

		// 1. ?꾩씠?? ?대쫫, ?대찓?쇱＜?? 鍮꾨?踰덊샇 ?뚰듃, 鍮꾨?踰덊샇 ?뺣떟??DB? ?쇱튂?섎뒗 ?ъ슜??Password瑜?議고쉶?쒕떎.
		LoginVO loginVO = loginDAO.searchPassword(vo);
		if (loginVO == null || loginVO.getPassword() == null || "".equals(loginVO.getPassword())) {
			return false;
		}

		// 2. ?꾩떆 鍮꾨?踰덊샇瑜??앹꽦?쒕떎.(????????????????8?먮━)
		String newpassword = "";
		for (int i = 1; i <= 8; i++) {
			// ?곸옄
			if (i % 3 != 0) {
				newpassword += EgovStringUtil.getRandomStr('a', 'z');
				// ?レ옄
			} else {
				newpassword += EgovNumberUtil.getRandomNum(0, 9);
			}
		}

		// 3. ?꾩떆 鍮꾨?踰덊샇瑜??뷀샇?뷀븯??DB????ν븳??
		LoginVO pwVO = new LoginVO();
		String enpassword = EgovFileScrty.encryptPassword(newpassword, vo.getId());
		pwVO.setId(vo.getId());
		pwVO.setPassword(enpassword);
		pwVO.setUserSe(vo.getUserSe());
		loginDAO.updatePassword(pwVO);

		// 4. ?꾩떆 鍮꾨?踰덊샇瑜??대찓??諛쒖넚?쒕떎.(硫붿씪?곕룞?붾（???쒖슜)
		SndngMailVO sndngMailVO = new SndngMailVO();
		sndngMailVO.setDsptchPerson("webmaster");
		sndngMailVO.setRecptnPerson(vo.getEmail());
		sndngMailVO.setSj("[MOIS] ?꾩떆 鍮꾨?踰덊샇瑜?諛쒖넚?덉뒿?덈떎.");
		sndngMailVO.setEmailCn("怨좉컼?섏쓽 ?꾩떆 鍮꾨?踰덊샇??" + newpassword + " ?낅땲??");
		sndngMailVO.setAtchFileId("");

		result = sndngMailRegistService.insertSndngMail(sndngMailVO);

		return result;
	}

	/**
	 * 濡쒓렇?몄씤利앹젣?쒖쓣 議고쉶?쒕떎.
	 * 
	 * @param vo LoginVO
	 * @return Map
	 * @exception Exception
	 */
	@Override
	public Map<?, ?> selectLoginIncorrect(LoginVO vo) throws Exception {
		return loginDAO.selectLoginIncorrect(vo);
	}

	/**
	 * 濡쒓렇?몄씤利앹젣?쒖쓣 泥섎━?쒕떎.
	 * 
	 * @param vo LoginVO
	 * @param vo mapLockUserInfo
	 * @return String
	 * @exception Exception
	 */
	@Override
	public String processLoginIncorrect(LoginVO vo, Map<?, ?> mapLockUserInfo) throws Exception {
		String sRtnCode = "C";
		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		String enpassword = EgovFileScrty.encryptPassword(vo.getPassword(), EgovStringUtil.isNullToString(vo.getId()));
		Map<String, String> mapParam = new HashMap<String, String>();
		mapParam.put("USER_SE", vo.getUserSe());
		mapParam.put("id", EgovStringUtil.isNullToString(vo.getId()));// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		// ?좉???
		if ("Y".equals(mapLockUserInfo.get("lockAt"))) {
			sRtnCode = "L";
			// ?⑤뱶?뚮뱶 ?몄쬆??
		} else if (((String) mapLockUserInfo.get("userPw")).equals(enpassword)) {
			// LOCK ?댁젣
			mapParam.put("updateAt", "E");
			loginDAO.updateLoginIncorrect(mapParam);
			sRtnCode = "E";
			// ?⑤뱶?뚮뱶 鍮꾩씤利앹떆
		} else if (!"Y".equals(mapLockUserInfo.get("lockAt"))) {
			// LOCK ?ㅼ젙
			if (Integer.parseInt(String.valueOf(mapLockUserInfo.get("lockCnt"))) + 1 >= egovLoginConfig
					.getLockCount()) {
				mapParam.put("updateAt", "L");
				loginDAO.updateLoginIncorrect(mapParam);
				sRtnCode = "L";
				// LOCK 利앷?
			} else {
				mapParam.put("updateAt", "C");
				loginDAO.updateLoginIncorrect(mapParam);
				sRtnCode = "C";
			}
		}
		return sRtnCode;
	}

	/**
	 * 鍮꾨?踰덊샇瑜??섏젙?쒗썑 寃쎄낵???좎쭨瑜?議고쉶?쒕떎.
	 * 
	 * @param vo LoginVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectPassedDayChangePWD(LoginVO vo) throws Exception {
		return loginDAO.selectPassedDayChangePWD(vo);
	}

	/**
	 * ?붿??몄썝?⑥뒪 ?몄쬆 ?뚯썝 議고쉶?쒕떎.
	 * 
	 * @param id
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO onepassLogin(String id) throws Exception {
		LoginVO loginVO = loginDAO.onepassLogin(id);
		return loginVO;
	}

}
