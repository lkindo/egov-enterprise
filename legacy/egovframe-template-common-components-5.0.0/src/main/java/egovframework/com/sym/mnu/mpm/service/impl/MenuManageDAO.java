 package egovframework.com.sym.mnu.mpm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
/**
 * 硫붾돱愿由? 硫붾돱?앹꽦, ?ъ씠?몃㏊ ?앹꽦?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         理쒖큹 ?앹꽦
 *   2011.07.01  ?쒖???		?먭린 硫붾돱 ?뺣낫瑜??곸쐞硫붾돱 ?뺣낫濡?李몄“?섎뒗 硫붾돱?뺣낫媛 ?덈뒗吏 議고쉶?섎뒗
 *   							selectUpperMenuNoByPk() 硫붿꽌??異붽?
 *
 * </pre>
 */

@Repository("menuManageDAO")
public class MenuManageDAO extends EgovComAbstractDAO{

	/**
     * 硫붾돱紐⑸줉??議고쉶
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     */
    public List<EgovMap> selectMenuManageList(ComDefaultVO vo) throws Exception {
        return selectList("menuManageDAO.selectMenuManageList_D", vo);
    }

    /**
	 * 硫붾돱紐⑸줉愿由?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
    public int selectMenuManageListTotCnt(ComDefaultVO vo) {
        return (Integer)selectOne("menuManageDAO.selectMenuManageListTotCnt_S", vo);
    }

	/**
	 * 硫붾돱紐⑸줉愿由?湲곕낯?뺣낫瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return MenuManageVO
	 * @exception Exception
	 */
	public MenuManageVO selectMenuManage(ComDefaultVO vo)throws Exception{
		return (MenuManageVO)selectOne("menuManageDAO.selectMenuManage_D", vo);
	}

	/**
	 * 硫붾돱紐⑸줉 湲곕낯?뺣낫瑜??깅줉
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	public void insertMenuManage(MenuManageVO vo){
		insert("menuManageDAO.insertMenuManage_S", vo);
	}

	/**
	 * 硫붾돱紐⑸줉 湲곕낯?뺣낫瑜??섏젙
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	public void updateMenuManage(MenuManageVO vo){
		update("menuManageDAO.updateMenuManage_S", vo);
	}

	/**
	 * 硫붾돱紐⑸줉 湲곕낯?뺣낫瑜???젣
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	public void deleteMenuManage(MenuManageVO vo){
		delete("menuManageDAO.deleteMenuManage_S", vo);
	}

	/**
	 * 硫붾돱 ?꾩껜紐⑸줉??議고쉶
	 * @return list
	 * @exception Exception
	 */
	public List<EgovMap> selectMenuList() throws Exception{
		ComDefaultVO vo  = new ComDefaultVO();
		return selectList("menuManageDAO.selectMenuListT_D", vo);
	}


	/**
	 * 硫붾돱踰덊샇 議댁옱?щ?瑜?議고쉶
	 * @param vo MenuManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectMenuNoByPk(MenuManageVO vo) throws Exception{
		return (Integer)selectOne("menuManageDAO.selectMenuNoByPk", vo);
	}



	/**
	 * 硫붾돱踰덊샇瑜??곸쐞硫붾돱濡?李몄“?섍퀬 ?덈뒗 硫붾돱 議댁옱?щ?瑜?議고쉶
	 * @param vo MenuManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectUpperMenuNoByPk(MenuManageVO vo) throws Exception{
		return (Integer)selectOne("menuManageDAO.selectUpperMenuNoByPk", vo);
	}


	/**
	 * 硫붾돱?뺣낫 ?꾩껜??젣 珥덇린??
	 * @return boolean
	 * @exception Exception
	 */
	public boolean deleteAllMenuList(){
		MenuManageVO vo = new MenuManageVO();
		insert("menuManageDAO.deleteAllMenuList", vo);
		return true;
	}

    /**
	 * 硫붾돱?뺣낫 議댁옱?щ? 議고쉶?쒕떎.
	 * @return int
	 * @exception Exception
	 */
    public int selectMenuListTotCnt() {
    	MenuManageVO vo = new MenuManageVO();
        return (Integer)selectOne("menuManageDAO.selectMenuListTotCnt", vo);
    }


	/*### 硫붾돱愿???꾨줈?몄뒪 ###*/
	/**
	 * MainMenu Head Menu 議고쉶
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 */
	public List<?> selectMainMenuHead(MenuManageVO vo) throws Exception{
		return selectList("menuManageDAO.selectMainMenuHead", vo);
	}

	/**
	 * MainMenu Left Menu 議고쉶
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 */
	public List<?> selectMainMenuLeft(MenuManageVO vo) throws Exception{
		return selectList("menuManageDAO.selectMainMenuLeft", vo);
	}

	/**
	 * MainMenu Head MenuURL 議고쉶
	 * @param vo MenuManageVO
	 * @return  String
	 * @exception Exception
	 */
	public String selectLastMenuURL(MenuManageVO vo) throws Exception{
		return (String)selectOne("menuManageDAO.selectLastMenuURL", vo);
	}

	/**
	 * MainMenu Left Menu 議고쉶
	 * @param vo MenuManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectLastMenuNo(MenuManageVO vo) throws Exception{
		return (Integer)selectOne("menuManageDAO.selectLastMenuNo", vo);
	}

	/**
	 * MainMenu Left Menu 議고쉶
	 * @param vo MenuManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectLastMenuNoCnt(MenuManageVO vo) throws Exception{
		return (Integer)selectOne("menuManageDAO.selectLastMenuNoCnt", vo);
	}
}