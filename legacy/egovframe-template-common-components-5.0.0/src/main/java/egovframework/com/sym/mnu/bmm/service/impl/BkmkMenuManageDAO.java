package egovframework.com.sym.mnu.bmm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.mnu.bmm.service.BkmkMenuManage;
import egovframework.com.sym.mnu.bmm.service.BkmkMenuManageVO;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;


/**
 * @Class Name : BkmkMenuManageDAO.java
 * @Description : 諛붾줈媛湲곕찓?대? 愿由ы븯???쒕퉬?ㅻ? ?뺤쓽?섍린?꾪븳 ?곗씠???묎렐 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 9. 25.     ?ㅼ꽦濡?
 *
 * @author 怨듯넻 而댄룷?뚰듃 媛쒕컻? ?ㅼ꽦濡?
 * @since 2009. 9. 25.
 * @version
 * @see
 *
 */
@Repository("bkmkMenuManageDAO")
public class BkmkMenuManageDAO extends EgovComAbstractDAO{

    /**
     * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜???젣?쒕떎.
     *
     * @param BkmkMenuManage
     * @return
     * @throws Exception
     */
    public void deleteBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception {
        delete("BkmkMenuManageDAO.deleteBkmkMenuManage", bkmkMenuManage);
    }

    /**
     * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜??깅줉?쒕떎.
     *
     * @param BkmkMenuManage
     * @return
     * @throws Exception
     */
    public void insertBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception {
        insert("BkmkMenuManageDAO.insertBkmkMenuManage", bkmkMenuManage);
    }

    /**
     * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜?議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @return
     * @throws Exception
     */
    public BkmkMenuManageVO selectBkmkMenuManageResult(BkmkMenuManageVO bkmkMenuManageVO)
            throws Exception {
        BkmkMenuManageVO vo = new BkmkMenuManageVO();
        vo = (BkmkMenuManageVO)selectOne("BkmkMenuManageDAO.selectBkmkMenuManage", bkmkMenuManageVO);
        return vo;
    }

    /**
     * 議곌굔??留욌뒗 諛붾줈媛湲곕찓?닿?由??뺣낫 紐⑸줉??議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @return
     * @throws Exception
     */
	public List<BkmkMenuManageVO> selectBkmkMenuManageList(BkmkMenuManageVO bkmkMenuManageVO)
            throws Exception {
        return selectList("BkmkMenuManageDAO.selectBkmkMenuManageList", bkmkMenuManageVO);
    }

    /**
     * 議곌굔??留욌뒗 諛붾줈媛湲곕찓?닿?由??뺣낫 紐⑸줉??嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @return
     * @throws Exception
     */
    public int selectBkmkMenuManageListCnt(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {
        return (Integer)selectOne("BkmkMenuManageDAO.selectBkmkMenuManageListCnt", bkmkMenuManageVO);
    }

    /**
     * ?깅줉?? 硫붾돱?뺣낫 紐⑸줉??議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @return
     * @throws Exception
     */
	public List<BkmkMenuManageVO> selectBkmkMenuList(BkmkMenuManageVO bkmkMenuManageVO)
            throws Exception {
        return selectList("BkmkMenuManageDAO.selectBkmkMenuList", bkmkMenuManageVO);
    }

    /**
     * ?깅줉?? 硫붾돱?뺣낫 紐⑸줉??嫄댁닔瑜?議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @return
     * @throws Exception
     */
    public int selectBkmkMenuListCnt(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {
        return (Integer)selectOne("BkmkMenuManageDAO.selectBkmkMenuListCnt", bkmkMenuManageVO);
    }

    /**
     * 誘몃━蹂닿린瑜???諛붾줈媛湲곕찓?닿?由ъ쓽 紐⑸줉??議고쉶?쒕떎.
     *
     * @param BkmkMenuManageVO
     * @return
     * @throws Exception
     */
    public List<MenuManageVO> selectBkmkPreview(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {
        return selectList("BkmkMenuManageDAO.selectBkmkPreview", bkmkMenuManageVO);
    }

    /**
     * ?좏깮??硫붾돱??URL ??議고쉶?쒕떎.
     *
     * @param bkmkMenuManage
     * @return
     * @throws Exception
     */
    public String selectUrl(BkmkMenuManage bkmkMenuManage) throws Exception {
        return (String)selectOne("BkmkMenuManageDAO.selectUrl", bkmkMenuManage);
    }
}

