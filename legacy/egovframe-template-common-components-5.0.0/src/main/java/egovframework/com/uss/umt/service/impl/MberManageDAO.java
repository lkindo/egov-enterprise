package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.umt.service.MberManageVO;
import egovframework.com.uss.umt.service.StplatVO;
import egovframework.com.uss.umt.service.UserDefaultVO;

/**
 * ?쇰컲?뚯썝愿由ъ뿉 愿???곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Repository("mberManageDAO")
public class MberManageDAO extends EgovComAbstractDAO{

    /**
     * 湲??깅줉???뱀젙 ?쇰컲?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
     * @param userSearchVO 寃?됱“嫄?
     * @return List<MberManageVO> 湲곗뾽?뚯썝 紐⑸줉?뺣낫
     */
	public List<MberManageVO> selectMberList(UserDefaultVO userSearchVO){
        return selectList("mberManageDAO.selectMberList", userSearchVO);
    }

    /**
     * ?쇰컲?뚯썝 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param userSearchVO 寃?됱“嫄?
     * @return int ?쇰컲?뚯썝珥앷컻??
     */
    public int selectMberListTotCnt(UserDefaultVO userSearchVO) {
        return (Integer)selectOne("mberManageDAO.selectMberListTotCnt", userSearchVO);
    }

    /**
     * ?붾㈃??議고쉶???쇰컲?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
     * @param delId ??젣 ????쇰컲?뚯썝?꾩씠??
     */
    public void deleteMber(String delId){
        delete("mberManageDAO.deleteMber_S", delId);
    }

    /**
     * ?쇰컲?뚯썝??湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
     * @param mberManageVO ?쇰컲?뚯썝 ?깅줉?뺣낫
     * @return String ?깅줉寃곌낵
     */
    public String insertMber(MberManageVO mberManageVO){
        return String.valueOf(insert("mberManageDAO.insertMber_S", mberManageVO));
    }

    /**
     * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗?쇰컲?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
     * @param mberId ?곸꽭議고쉶????쇰컲?뚯썝?꾩씠??
     * @return MberManageVO ?쇰컲?뚯썝 ?곸꽭?뺣낫
     */
    public MberManageVO selectMber(String mberId){
        return (MberManageVO) selectOne("mberManageDAO.selectMber_S", mberId);
    }

    /**
     * ?붾㈃??議고쉶?쒖씪諛섑쉶?먯쓽 湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
     * @param mberManageVO ?쇰컲?뚯썝?섏젙?뺣낫
     */
    public void updateMber(MberManageVO mberManageVO){
        update("mberManageDAO.updateMber_S",mberManageVO);
    }

    /**
     * ?쇰컲?뚯썝 ?쎄??뺤씤
     * @param stplatId ?쇰컲?뚯썝?쎄??꾩씠??
     * @return List ?쇰컲?뚯썝?쎄??뺣낫
     */
    public List<StplatVO> selectStplat(String stplatId){
    	return selectList("mberManageDAO.selectStplat_S", stplatId);
    }

    /**
     * ?쇰컲?뚯썝 ?뷀샇?섏젙
     * @param passVO 湲곗뾽?뚯썝?섏젙?뺣낫(鍮꾨?踰덊샇)
     */
    public void updatePassword(MberManageVO passVO) {
        update("mberManageDAO.updatePassword_S", passVO);
    }

    /**
     * ?쇰컲?뚯썝??鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
     * @param mberManageVO ?쇰컲?뚯썝?뷀샇 議고쉶議곌굔?뺣낫
     * @return MberManageVO ?쇰컲?뚯썝 ?뷀샇?뺣낫
     */
    public MberManageVO selectPassword(MberManageVO mberManageVO){
    	return (MberManageVO) selectOne("mberManageDAO.selectPassword_S", mberManageVO);
    }


    /**
     * 濡쒓렇?몄씤利앹젣???댁젣
     * @param mberManageVO ?쇰컲?뚯썝?뺣낫
     */
    public void updateLockIncorrect(MberManageVO mberManageVO) {
        update("mberManageDAO.updateLockIncorrect", mberManageVO);
    }

}
