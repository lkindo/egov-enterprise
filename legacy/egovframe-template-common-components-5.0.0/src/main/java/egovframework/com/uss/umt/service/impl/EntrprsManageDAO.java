package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.umt.service.EntrprsManageVO;
import egovframework.com.uss.umt.service.StplatVO;
import egovframework.com.uss.umt.service.UserDefaultVO;

/**
 * 湲곗뾽?뚯썝愿由ъ뿉 愿???곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
 *   2017.07.21  ?λ룞??			濡쒓렇?몄씤利앹젣???묒뾽
 *
 * </pre>
 */
@Repository("entrprsManageDAO")
public class EntrprsManageDAO extends EgovComAbstractDAO{

    /**
     * ?붾㈃??議고쉶??湲곗뾽?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
     * @param delId
     */
    public void deleteEntrprsmber(String delId){
        delete("entrprsManageDAO.deleteEntrprs_S", delId);
    }

    /**
     * 湲곗뾽?뚯썝??湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
     * @param entrprsManageVO 湲곗뾽?뚯썝 ?깅줉?뺣낫
     * @return String ?깅줉寃곌낵
     */
    public String insertEntrprsmber(EntrprsManageVO entrprsManageVO){
        return String.valueOf(insert("entrprsManageDAO.insertEntrprs_S", entrprsManageVO));
    }

    /**
     * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗 湲곗뾽?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
     * @param entrprsmberId ?곸꽭議고쉶???湲곗뾽?뚯썝?꾩씠??
     * @return EntrprsManageVO 湲곗뾽?뚯썝 ?곸꽭?뺣낫
     */
    public EntrprsManageVO selectEntrprsmber(String entrprsmberId){
        return (EntrprsManageVO) selectOne("entrprsManageDAO.selectEntrprs_S", entrprsmberId);
    }

    /**
     * ?붾㈃??議고쉶???ъ슜?먯쓽 湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
     * @param entrprsManageVO 湲곗뾽?뚯썝 ?섏젙?뺣낫
     */
    public void updateEntrprsmber(EntrprsManageVO entrprsManageVO){
        update("entrprsManageDAO.updateEntrprs_S",entrprsManageVO);
    }

    /**
     * ?쎄??뺣낫瑜?議고쉶
     * @param stplatId 湲곗뾽?뚯썝 ?쎄??꾩씠??
     * @return List 湲곗뾽?뚯썝?쎄??뺣낫
     */
    public List<StplatVO> selectStplat(String stplatId) {
    	return selectList("entrprsManageDAO.selectStplat_S", stplatId);
    }

    /**
     * 湲곗뾽?뚯썝 ?뷀샇?섏젙
     * @param passVO 湲곗뾽?뚯썝?섏젙?뺣낫(鍮꾨?踰덊샇)
     */
    public void updatePassword(EntrprsManageVO passVO) {
    	update("entrprsManageDAO.updatePassword_S", passVO);
    }

    /**
     * 湲곗뾽?뚯썝??鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
     * @param entrprsManageVO 湲곗뾽?뚯썝?뷀샇 議고쉶議곌굔?뺣낫
     * @return EntrprsManageVO 湲곗뾽?뚯썝?뷀샇?뺣낫
     */
    public EntrprsManageVO selectPassword(EntrprsManageVO entrprsManageVO){
    	return (EntrprsManageVO) selectOne("entrprsManageDAO.selectPassword_S", entrprsManageVO);
    }

    /**
     * 湲??깅줉???뱀젙 湲곗뾽?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
     * @param userSearchVO 寃?됱“嫄?
     * @return List<EntrprsManageVO>
     */
	public List<EntrprsManageVO> selectEntrprsMberList(UserDefaultVO userSearchVO){
        return selectList("entrprsManageDAO.selectEntrprsMberList", userSearchVO);
    }
    /**
     * 湲곗뾽?뚯썝 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param userSearchVO 寃?됱“嫄?
     * @return int 湲곗뾽?뚯썝珥앷컻??
     */
    public int selectEntrprsMberListTotCnt(UserDefaultVO userSearchVO) {
        return (Integer)selectOne("entrprsManageDAO.selectEntrprsMberListTotCnt", userSearchVO);
    }


    /**
     * 濡쒓렇?몄씤利앹젣???댁젣
     * @param entrprsManageVO 湲곗뾽?뚯썝?뺣낫
     */
    public void updateLockIncorrect(EntrprsManageVO entrprsManageVO) {
        update("entrprsManageDAO.updateLockIncorrect", entrprsManageVO);
    }
}
