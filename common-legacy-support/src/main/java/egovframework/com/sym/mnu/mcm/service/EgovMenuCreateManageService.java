package egovframework.com.sym.mnu.mcm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;


/**
 * ??? ?????????????????? ???.
 * @author ?? ?? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         ????
 *
 * </pre>
 **/
public interface EgovMenuCreateManageService {

	/**
	 * ID ????????
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectUsrByPk(ComDefaultVO vo) throws Exception;

	/**
	 * ID??????????
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 **/
	MenuCreatVO selectAuthorByUsr(ComDefaultVO vo) throws Exception;


	/**
     * ??????????
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     **/
    List<EgovMap> selectMenuCreatManagList(ComDefaultVO vo) throws Exception;

	/**
	 * ?????????? ???.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectMenuCreatManagTotCnt(ComDefaultVO vo) throws Exception;

	/**
     * ??? ??????
     * 
     * @param vo MenuCreatVO
     * @return List
     * @exception Exception
     **/
    List<EgovMap> selectMenuCreatList(MenuCreatVO vo) throws Exception;


	/**
	 * ?????????????? ?????? ??
	 * @param checkedScrtyForInsert String
	 * @param checkedMenuNoForInsert String
	 * @exception Exception
	 **/
	void insertMenuCreatList(String checkedScrtyForInsert, String checkedMenuNoForInsert) throws Exception;

	/**
	 * ??? ???? ?? ??
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 **/
	List<EgovMap> selectMenuCreatSiteMapList(MenuSiteMapVO vo) throws Exception;

	/**
	 * ?????????? ?? ??
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 **/
	 List<?> selectSiteMapByUser(MenuSiteMapVO vo) throws Exception;

	 /**
	 * ???? ?
	 * ???? ???? ??????
	 * @param vo MenuSiteMapVO
	 * @param vHtmlValue String
	 * @return boolean
	 * @exception Exception
	 **/
	 //boolean creatSiteMap(MenuSiteMapVO vo, String vHtmlValue) throws Exception;
}
