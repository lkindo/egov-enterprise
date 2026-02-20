package egovframework.com.sym.mnu.mcm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.mnu.mcm.service.MenuCreatVO;
import egovframework.com.sym.mnu.mcm.service.MenuSiteMapVO;

/**
 * 硫붾돱?앹꽦, ?ъ씠?몃㏊ ?앹꽦?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎. *
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?쒖???
 * @since 2011.06.30
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2011.06.30  ??以 ??  理쒖큹 ?앹꽦(MenuManageDAO ?대옒?ㅻ줈 遺??遺꾨━
 *   					   硫붿냼?쒕뱾??MenuManageDAO ?대옒?ㅼ뿉??遺꾨━?댁삷)
 *
 * </pre>
 */

@Repository("menuCreateManageDAO")
public class MenuCreateManageDAO extends EgovComAbstractDAO{



	/**
	 * ID 議댁옱?щ?瑜?議고쉶
	 * @param vo MenuManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectUsrByPk(ComDefaultVO vo) throws Exception{
		return (Integer)selectOne("menuManageDAO.selectUsrByPk", vo);
	}

	/**
	 * ID?????沅뚰븳肄붾뱶瑜?議고쉶
	 * @param vo MenuCreatVO
	 * @return int
	 * @exception Exception
	 */
	public MenuCreatVO selectAuthorByUsr(ComDefaultVO vo) throws Exception{
		return (MenuCreatVO)selectOne("menuManageDAO.selectAuthorByUsr", vo);
	}

	/**
     * 硫붾돱?앹꽦愿由??댁뿭??議고쉶
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     */
    public List<EgovMap> selectMenuCreatManagList(ComDefaultVO vo) throws Exception {
        return selectList("menuManageDAO.selectMenuCreatManageList_D", vo);
    }

	/**
	 * 硫붾돱?앹꽦愿由?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
    public int selectMenuCreatManagTotCnt(ComDefaultVO vo) {
        return (Integer)selectOne("menuManageDAO.selectMenuCreatManageTotCnt_S", vo);
    }

    /*********** 硫붾돱 ?앹꽦 愿由?***************/
    /**
     * 硫붾돱?앹꽦 ?댁뿭??議고쉶
     * 
     * @param vo MenuCreatVO
     * @return List
     * @exception Exception
     */
    public List<EgovMap> selectMenuCreatList(MenuCreatVO vo) throws Exception {
        return selectList("menuManageDAO.selectMenuCreatList_D", vo);
    }

	/**
	 * 硫붾돱?앹꽦?댁뿭 ?깅줉
	 * @param vo MenuCreatVO
	 * @exception Exception
	 */
	public void insertMenuCreat(MenuCreatVO vo){
		insert("menuManageDAO.insertMenuCreat_S", vo);
	}

	/**
	 * 硫붾돱?앹꽦 ?ъ씠?몃㏊ ?댁슜 議고쉶
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 */
	public List<EgovMap> selectMenuCreatSiteMapList(MenuSiteMapVO vo) throws Exception{
		return selectList("menuManageDAO.selectMenuCreatSiteMapList_D", vo);
	}



	/**
	 * ?ъ씠?몃㏊ ?깅줉
	 * @param vo MenuSiteMapVO
	 * @exception Exception
	 */
	public void creatSiteMap(MenuSiteMapVO vo){
		insert("menuManageDAO.insertSiteMap_S", vo);
	}

	/**
	 * ?ъ슜??沅뚰븳蹂??ъ씠?몃㏊ ?댁슜 議고쉶
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 */
	public List<?> selectSiteMapByUser(MenuSiteMapVO vo) throws Exception{
		return selectList("menuManageDAO.selectSiteMapByUser", vo);
	}

	/**
	 * 硫붾돱?앹꽦?댁뿭 議댁옱?щ? 議고쉶?쒕떎.
	 * @param vo MenuCreatVO
	 * @return int
	 * @exception Exception
	 */
    public int selectMenuCreatCnt(MenuCreatVO vo) {
        return (Integer)selectOne("menuManageDAO.selectMenuCreatCnt_S", vo);
    }


	/**
	 * 硫붾돱?앹꽦?댁뿭 ?섏젙
	 * @param vo MenuCreatVO
	 * @exception Exception
	 */
	public void updateMenuCreat(MenuCreatVO vo){
		update("menuManageDAO.updateMenuCreat_S", vo);
	}


	/**
	 * 硫붾돱?앹꽦?댁뿭 ??젣
	 * @param vo MenuCreatVO
	 * @exception Exception
	 */
	public void deleteMenuCreat(MenuCreatVO vo){
		delete("menuManageDAO.deleteMenuCreat_S", vo);
	}

	/**
	 * ?ъ씠?몃㏊ 議댁옱?щ? 議고쉶?쒕떎.
	 * @param vo MenuSiteMapVO
	 * @return int
	 * @exception Exception
	 */
    public int selectSiteMapCnt(MenuSiteMapVO vo) {
        return (Integer)selectOne("menuManageDAO.selectSiteMapCnt_S", vo);
    }

}
