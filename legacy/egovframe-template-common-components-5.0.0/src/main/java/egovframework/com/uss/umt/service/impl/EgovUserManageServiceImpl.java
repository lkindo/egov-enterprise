package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.uss.umt.service.EgovUserManageService;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.uss.umt.service.UserManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;

/**
 * ?ъ슜?먭?由ъ뿉 愿??鍮꾩??덉뒪 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? 議곗옱??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  議곗옱??         理쒖큹 ?앹꽦
 *   2014.12.08	 ?닿린??		?뷀샇?붾갑??蹂寃?EgovFileScrty.encryptPassword)
 *   2017.07.21  ?λ룞??			濡쒓렇?몄씤利앹젣???묒뾽
 *
 * </pre>
 */
@Service("userManageService")
public class EgovUserManageServiceImpl extends EgovAbstractServiceImpl implements EgovUserManageService {

	/** userManageDAO */
	@Resource(name="userManageDAO")
	private UserManageDAO userManageDAO;

	/** mberManageDAO */
	@Resource(name="mberManageDAO")
	private MberManageDAO mberManageDAO;

	/** entrprsManageDAO */
	@Resource(name="entrprsManageDAO")
	private EntrprsManageDAO entrprsManageDAO;

	/** egovUsrCnfrmIdGnrService */
	@Resource(name="egovUsrCnfrmIdGnrService")
	private EgovIdGnrService idgenService;

	/**
	 * ?낅젰???ъ슜?먯븘?대뵒??以묐났?щ?瑜?泥댄겕?섏뿬 ?ъ슜媛?μ뿬遺瑜??뺤씤
	 * @param checkId 以묐났?щ? ?뺤씤????꾩씠??
	 * @return ?ъ슜媛?μ뿬遺(?꾩씠???ъ슜?뚯닔 int)
	 * @throws Exception
	 */
	@Override
	public int checkIdDplct(String checkId) {
		return userManageDAO.checkIdDplct(checkId);
	}

	/**
	 * ?붾㈃??議고쉶???ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedIdForDel ??젣????낅Т?ъ슜?먯븘?대뵒
	 * @throws Exception
	 */
	@Override
	public void deleteUser(String checkedIdForDel) {
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		String [] delId = EgovStringUtil.isNullToString(checkedIdForDel).split(",");
		for (String element : delId) {
			String [] id = element.split(":");
			if (id[0].equals("USR03")){
		        //?낅Т?ъ슜??吏곸썝)??젣
				userManageDAO.deleteUser(id[1]);
			}else if(id[0].equals("USR01")){
				//?쇰컲?뚯썝??젣
				mberManageDAO.deleteMber(id[1]);
			}else if(id[0].equals("USR02")){
				//湲곗뾽?뚯썝??젣
				entrprsManageDAO.deleteEntrprsmber(id[1]);
			}
		}
	}

	/**
	 * @param userManageVO ?낅Т?ъ슜???깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	@Override
	public String insertUser(UserManageVO userManageVO) throws Exception {
		//怨좎쑀?꾩씠???뗮똿
		String uniqId = idgenService.getNextStringId();
		userManageVO.setUniqId(uniqId);
		//?⑥뒪?뚮뱶 ?뷀샇??
		String pass = EgovFileScrty.encryptPassword(userManageVO.getPassword(), EgovStringUtil.isNullToString(userManageVO.getEmplyrId()));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		userManageVO.setPassword(pass);
		String result = userManageDAO.insertUser(userManageVO);
		return result;
	}

	/**
	 * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗 ?ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param uniqId ?곸꽭議고쉶????낅Т?ъ슜???꾩씠??
	 * @return userManageVO ?낅Т?ъ슜???곸꽭?뺣낫
	 * @throws Exception
	 */
	@Override
	public UserManageVO selectUser(String uniqId) {
		UserManageVO userManageVO = userManageDAO.selectUser(uniqId);
		return userManageVO;
	}

	/**
	 * 湲??깅줉???뱀젙 ?ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param userSearchVO 寃?됱“嫄?
	 * @return List<UserManageVO> ?낅Т?ъ슜??紐⑸줉?뺣낫
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectUserList(UserDefaultVO userSearchVO) {
		List<EgovMap> result = userManageDAO.selectUserList(userSearchVO);
		return result;
	}

	/**
	 * 湲??깅줉???뱀젙 ?ъ슜?먮ぉ濡앹쓽 ?꾩껜?섎? ?뺤씤
	 * @param userSearchVO 寃?됱“嫄?
	 * @return 珥앹궗?⑹옄媛쒖닔(int)
	 * @throws Exception
	 */
	@Override
	public int selectUserListTotCnt(UserDefaultVO userSearchVO) {
		return userManageDAO.selectUserListTotCnt(userSearchVO);
	}

	/**
	 * ?붾㈃??議고쉶???ъ슜?먯쓽 湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫
	 * @throws Exception
	 */
	@Override
	public void updateUser(UserManageVO userManageVO) throws Exception {
		//?⑥뒪?뚮뱶 ?뷀샇??
		String pass = EgovFileScrty.encryptPassword(userManageVO.getPassword(), EgovStringUtil.isNullToString(userManageVO.getEmplyrId()));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		userManageVO.setPassword(pass);

		userManageDAO.updateUser(userManageVO);
	}

	/**
	 * ?ъ슜?먯젙蹂??섏젙???덉뒪?좊━ ?뺣낫瑜?異붽?
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	@Override
	public String insertUserHistory(UserManageVO userManageVO) {
		return userManageDAO.insertUserHistory(userManageVO);
	}

	/**
	 * ?낅Т?ъ슜???뷀샇 ?섏젙
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫(鍮꾨?踰덊샇)
	 * @throws Exception
	 */
	@Override
	public void updatePassword(UserManageVO userManageVO) {
		userManageDAO.updatePassword(userManageVO);
	}

	/**
	 * ?ъ슜?먭? 鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
	 * @param passVO ?낅Т?ъ슜???뷀샇 議고쉶議곌굔?뺣낫
	 * @return userManageVO ?낅Т?ъ슜???뷀샇?뺣낫
	 * @throws Exception
	 */
	@Override
	public UserManageVO selectPassword(UserManageVO passVO) {
		UserManageVO userManageVO = userManageDAO.selectPassword(passVO);
		return userManageVO;
	}


	/**
	 * 濡쒓렇?몄씤利앹젣???댁젣
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫
	 * @return void
	 * @throws Exception
	 */
	@Override
	public void updateLockIncorrect(UserManageVO userManageVO) throws Exception {
		userManageDAO.updateLockIncorrect(userManageVO);
	}



}
