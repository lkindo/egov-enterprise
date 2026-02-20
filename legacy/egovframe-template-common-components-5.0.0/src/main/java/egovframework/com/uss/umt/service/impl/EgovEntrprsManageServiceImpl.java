package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.umt.service.EgovEntrprsManageService;
import egovframework.com.uss.umt.service.EntrprsManageVO;
import egovframework.com.uss.umt.service.StplatVO;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;

/**
 * 湲곗뾽?뚯썝愿由ъ뿉 愿??鍮꾩??덉뒪?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("entrprsManageService")
public class EgovEntrprsManageServiceImpl extends EgovAbstractServiceImpl implements EgovEntrprsManageService {

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
	 * 湲곗뾽?뚯썝??湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param entrprsManageVO 湲곗뾽?뚯썝?깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
    @Override
	public String insertEntrprsmber(EntrprsManageVO entrprsManageVO) throws Exception  {
        //怨좎쑀?꾩씠???뗮똿
    	String uniqId = idgenService.getNextStringId();
        entrprsManageVO.setUniqId(uniqId);
        //?⑥뒪?뚮뱶 ?뷀샇??
		String pass = EgovFileScrty.encryptPassword(entrprsManageVO.getEntrprsMberPassword(), EgovStringUtil.isNullToString(entrprsManageVO.getEntrprsmberId()));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		entrprsManageVO.setEntrprsMberPassword(pass);

        String result = entrprsManageDAO.insertEntrprsmber(entrprsManageVO);
        return result;
    }

    /**
	 * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗湲곗뾽?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param uniqId 議고쉶???湲곗뾽?뚯썝?꾩씠??
	 * @return entrprsManageVO 湲곗뾽?뚯썝?뺣낫
	 * @throws Exception
	 */
    @Override
	public EntrprsManageVO selectEntrprsmber(String uniqId) {
        EntrprsManageVO entrprsManageVO = entrprsManageDAO.selectEntrprsmber(uniqId);
        return entrprsManageVO;
    }

	/**
	 * ?붾㈃??議고쉶??湲곗뾽?뚯썝??湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param entrprsManageVO 湲곗뾽?뚯썝?섏젙?뺣낫
	 * @throws Exception
	 */
    @Override
	public void updateEntrprsmber(EntrprsManageVO entrprsManageVO) throws Exception {
    	//?⑥뒪?뚮뱶 ?뷀샇??
		String pass = EgovFileScrty.encryptPassword(entrprsManageVO.getEntrprsMberPassword(), EgovStringUtil.isNullToString(entrprsManageVO.getEntrprsmberId()));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		entrprsManageVO.setEntrprsMberPassword(pass);
		entrprsManageDAO.updateEntrprsmber(entrprsManageVO);
    }

	/**
	 * ?붾㈃??議고쉶??湲곗뾽?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedIdForDel ??젣??곴린?낇쉶?먯븘?대뵒
	 * @throws Exception
	 */
    @Override
	public void deleteEntrprsmber(String checkedIdForDel)  {
        //log.debug("jjyser_delete-->"+checkedIdForDel);
        String [] delId = checkedIdForDel.split(",");
        for (String element : delId) {
            String [] id = element.split(":");
            //log.debug("id[0]:"+id[0]);
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
	 * 湲곗뾽?뚯썝???쎄??뺣낫 議고쉶
	 * @param stplatId 湲곗뾽?뚯썝?쎄??꾩씠??
	 * @return stplatList 湲곗뾽?뚯썝?쎄??뺣낫
	 * @throws Exception
	 */
    @Override
	public List<StplatVO> selectStplat(String stplatId) {
    	List<StplatVO> stplatList = entrprsManageDAO.selectStplat(stplatId);
        return stplatList;
    }

	/**
	 * 湲곗뾽?뚯썝 ?뷀샇 ?섏젙
	 * @param passVO 湲곗뾽?뚯썝?섏젙?뺣낫(鍮꾨?踰덊샇)
	 * @throws Exception
	 */
	@Override
	public void updatePassword(EntrprsManageVO passVO) {
		entrprsManageDAO.updatePassword(passVO);
	}

	/**
	 * 湲곗뾽?뚯썝??鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
	 * @param passVO 湲곗뾽?뚯썝?뷀샇 議고쉶議곌굔?뺣낫
	 * @return entrprsManageVO 湲곗뾽?뚯썝?뷀샇?뺣낫
	 * @throws Exception
	 */
	@Override
	public EntrprsManageVO selectPassword(EntrprsManageVO passVO) {
		EntrprsManageVO entrprsManageVO = entrprsManageDAO.selectPassword(passVO);
		return entrprsManageVO;
	}

	/**
	 * 湲??깅줉?쒓린???뚯썝 以?寃?됱“嫄댁뿉 留욌뒗 ?뚯썝?ㅼ쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param userSearchVO 寃?됱“嫄?
	 * @return List<EntrprsManageVO> 湲곗뾽?뚯썝紐⑸줉?뺣낫
	 * @throws Exception
	 */
	@Override
	public List<EntrprsManageVO> selectEntrprsMberList(UserDefaultVO userSearchVO) {
		return entrprsManageDAO.selectEntrprsMberList(userSearchVO);
	}

    /**
     * 湲곗뾽?뚯썝 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param userSearchVO 寃?됱“嫄?
     * @return ?ъ슜??珥?媛쒖닔(int)
     * @throws Exception
     */
    @Override
	public int selectEntrprsMberListTotCnt(UserDefaultVO userSearchVO) {
    	return entrprsManageDAO.selectEntrprsMberListTotCnt(userSearchVO);
    }

    /**
     * 濡쒓렇?몄씤利앹젣???댁젣
     * @param entrprsManageVO 湲곗뾽?뚯썝?뺣낫
     * @return void
     * @throws Exception
     */
    @Override
    public void updateLockIncorrect(EntrprsManageVO entrprsManageVO) throws Exception {
    	entrprsManageDAO.updateLockIncorrect(entrprsManageVO);
    }


}