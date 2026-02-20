package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.uss.umt.service.UserManageVO;

/**
 * ?ъ슜?먭?由ъ뿉 愿???곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Repository("userManageDAO")
public class UserManageDAO extends EgovComAbstractDAO{

    /**
     * ?낅젰???ъ슜?먯븘?대뵒??以묐났?щ?瑜?泥댄겕?섏뿬 ?ъ슜媛?μ뿬遺瑜??뺤씤
     * @param checkId 以묐났泥댄겕????꾩씠??
     * @return int ?ъ슜媛?μ뿬遺(?꾩씠???ъ슜?뚯닔 )
     */
    public int checkIdDplct(String checkId){
        return (Integer)selectOne("userManageDAO.checkIdDplct_S", checkId);
    }

    /**
     * ?붾㈃??議고쉶???ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
     * @param delId ??젣????낅Т?ъ슜???꾩씠??
     */
    public void deleteUser(String delId){
        delete("userManageDAO.deleteUser_S", delId);
    }


    /**
     * ?ъ슜?먯쓽 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
     * @param userManageVO ?낅Т?ъ슜???깅줉?뺣낫
     * @return String result ?깅줉寃곌낵
     */
    public String insertUser(UserManageVO userManageVO){
        return String.valueOf(insert("userManageDAO.insertUser_S", userManageVO));
    }

    /**
     * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗 ?ъ슜?먮뱾???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
     * @param uniqId ?곸꽭議고쉶????낅Т?ъ슜?먯븘?대뵒
     * @return UserManageVO ?낅Т?ъ슜?? ?곸꽭?뺣낫
     */
    public UserManageVO selectUser(String uniqId){
        return (UserManageVO) selectOne("userManageDAO.selectUser_S", uniqId);
    }

    /**
     * 湲??깅줉???뱀젙 ?ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
     * @param userSearchVO 寃?됱“嫄?
     * @return List ?낅Т?ъ슜??紐⑸줉?뺣낫
     */
    public List<EgovMap> selectUserList(UserDefaultVO userSearchVO){
        return selectList("userManageDAO.selectUserList_S", userSearchVO);
    }

    /**
     * ?ъ슜?먯킑 媛쒖닔瑜?議고쉶?쒕떎.
     * @param userSearchVO 寃?됱“嫄?
     * @return int ?낅Т?ъ슜??珥앷컻??
     */
    public int selectUserListTotCnt(UserDefaultVO userSearchVO) {
        return (Integer)selectOne("userManageDAO.selectUserListTotCnt_S", userSearchVO);
    }

    /**
     * ?붾㈃??議고쉶???ъ슜?먯쓽 湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
     * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫
     */
    public void updateUser(UserManageVO userManageVO){
        update("userManageDAO.updateUser_S",userManageVO);
    }

    /**
     * ?ъ슜?먯젙蹂??섏젙???덉뒪?좊━ ?뺣낫瑜?異붽?
     * @param userManageVO ?낅Т?ъ슜???덉뒪?좊━ ?뺣낫
     * @return String ?덉뒪?좊━ ?깅줉寃곌낵
     */
    public String insertUserHistory(UserManageVO userManageVO){
    	return String.valueOf(insert("userManageDAO.insertUserHistory_S", userManageVO));
    }

    /**
     * ?낅Т?ъ슜???뷀샇?섏젙
     * @param passVO ?낅Т?ъ슜?먯닔?뺤젙蹂?鍮꾨?踰덊샇)
     */
    public void updatePassword(UserManageVO passVO) {
        update("userManageDAO.updatePassword_S", passVO);
    }

    /**
     * ?낅Т?ъ슜?먭? 鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
     * @param userManageVO ?낅Т ?ъ슜?먯븫??議고쉶議곌굔?뺣낫
     * @return UserManageVO ?낅Т?ъ슜???뷀샇?뺣낫
     */
    public UserManageVO selectPassword(UserManageVO userManageVO){
    	return (UserManageVO) selectOne("userManageDAO.selectPassword_S", userManageVO);
    }


    /**
     * 濡쒓렇?몄씤利앹젣???댁젣
     * @param passVO ?낅Т?ъ슜??
     */
    public void updateLockIncorrect(UserManageVO userManageVO) {
        update("userManageDAO.updateLockIncorrect", userManageVO);
    }

}