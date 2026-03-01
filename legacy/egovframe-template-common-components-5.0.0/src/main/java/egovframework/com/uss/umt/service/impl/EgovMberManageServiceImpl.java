package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.umt.service.EgovMberManageService;
import egovframework.com.uss.umt.service.MberManageVO;
import egovframework.com.uss.umt.service.StplatVO;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;

/**
 * ?쇰컲?뚯썝愿由ъ뿉 愿?쒕퉬吏?덉뒪?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("mberManageService")
public class EgovMberManageServiceImpl extends EgovAbstractServiceImpl implements EgovMberManageService {

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
	 * ?ъ슜?먯쓽 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param mberManageVO ?쇰컲?뚯썝 ?깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	@Override
	public String insertMber(MberManageVO mberManageVO) throws Exception  {
		//怨좎쑀?꾩씠???뗮똿
		String uniqId = idgenService.getNextStringId();
		mberManageVO.setUniqId(uniqId);
		//?⑥뒪?뚮뱶 ?뷀샇??
		String pass = EgovFileScrty.encryptPassword(mberManageVO.getPassword(), EgovStringUtil.isNullToString(mberManageVO.getMberId()));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		mberManageVO.setPassword(pass);

		String result = mberManageDAO.insertMber(mberManageVO);
		return result;
	}

	/**
	 * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗 ?쇰컲?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param uniqId ?곸꽭議고쉶????쇰컲?뚯썝?꾩씠??
	 * @return mberManageVO ?쇰컲?뚯썝?곸꽭?뺣낫
	 * @throws Exception
	 */
	@Override
	public MberManageVO selectMber(String uniqId) {
		MberManageVO mberManageVO = mberManageDAO.selectMber(uniqId);
		return mberManageVO;
	}

	/**
	 * 湲??깅줉???뚯썝 以?寃?됱“嫄댁뿉 留욌뒗 ?뚯썝?ㅼ쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param userSearchVO 寃?됱“嫄?
	 * @return List<MberManageVO> ?쇰컲?뚯썝紐⑸줉?뺣낫
	 */
	@Override
	public List<MberManageVO> selectMberList(UserDefaultVO userSearchVO) {
		return mberManageDAO.selectMberList(userSearchVO);
	}

    /**
     * ?쇰컲?뚯썝 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param userSearchVO 寃?됱“嫄?
     * @return ?쇰컲?뚯썝珥앷컻??int)
     */
    @Override
	public int selectMberListTotCnt(UserDefaultVO userSearchVO) {
    	return mberManageDAO.selectMberListTotCnt(userSearchVO);
    }

	/**
	 * ?붾㈃??議고쉶???쇰컲?뚯썝??湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param mberManageVO ?쇰컲?뚯썝?섏젙?뺣낫
	 * @throws Exception
	 */
	@Override
	public void updateMber(MberManageVO mberManageVO) throws Exception {
		//?⑥뒪?뚮뱶 ?뷀샇??
		String pass = EgovFileScrty.encryptPassword(mberManageVO.getPassword(), EgovStringUtil.isNullToString(mberManageVO.getMberId()));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		mberManageVO.setPassword(pass);
		mberManageDAO.updateMber(mberManageVO);
	}

	/**
	 * ?붾㈃??議고쉶???ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedIdForDel ??젣????쇰컲?뚯썝?꾩씠??
	 * @throws Exception
	 */
	@Override
	public void deleteMber(String checkedIdForDel)  {
		String [] delId = checkedIdForDel.split(",");
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
	 * ?쇰컲?뚯썝 ?쎄??뺤씤
	 * @param stplatId ?쇰컲?뚯썝?쎄??꾩씠??
	 * @return ?쇰컲?뚯썝?쎄??뺣낫(List)
	 * @throws Exception
	 */
	@Override
	public List<StplatVO> selectStplat(String stplatId)  {
        return mberManageDAO.selectStplat(stplatId);
	}

	/**
	 * ?쇰컲?뚯썝?뷀샇?섏젙
	 * @param mberManageVO ?쇰컲?뚯썝?섏젙?뺣낫(鍮꾨?踰덊샇)
	 * @throws Exception
	 */
	@Override
	public void updatePassword(MberManageVO mberManageVO) {
		mberManageDAO.updatePassword(mberManageVO);
	}

	/**
	 * ?쇰컲?뚯썝??鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
	 * @param passVO ?쇰컲?뚯썝?뷀샇 議고쉶議곌굔?뺣낫
	 * @return mberManageVO ?쇰컲?뚯썝?뷀샇?뺣낫
	 * @throws Exception
	 */
	@Override
	public MberManageVO selectPassword(MberManageVO passVO) {
		MberManageVO mberManageVO = mberManageDAO.selectPassword(passVO);
		return mberManageVO;
	}


	/**
	 * 濡쒓렇?몄씤利앹젣???댁젣
	 * @param mberManageVO ?쇰컲?뚯썝?뺣낫
	 * @return void
	 * @throws Exception
	 */
	@Override
	public void updateLockIncorrect(MberManageVO mberManageVO) throws Exception {
		mberManageDAO.updateLockIncorrect(mberManageVO);
	}

}
