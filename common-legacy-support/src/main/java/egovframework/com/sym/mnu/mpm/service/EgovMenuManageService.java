package egovframework.com.sym.mnu.mpm.service;

import java.io.InputStream;
import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??? ?????????????????? ???.
 * 
 * @author ?? ?? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         ????
 *   2011.07.01  ?????		?? ????????????? ?? ?? ???
 *   							selectUpperMenuNoByPk() ????
 *
 *      </pre>
 **/

public interface EgovMenuManageService {

	/**
	 * ????????
	 * 
	 * @param vo ComDefaultVO
	 * @return MenuManageVO
	 * @exception Exception
	 **/
	MenuManageVO selectMenuManage(ComDefaultVO vo) throws Exception;

	/**
	 * ??????
	 * 
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 **/
	List<MenuManageVO> selectMenuManageList(ComDefaultVO vo) throws Exception;

	/**
	 * ?? ???? ???.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectMenuManageListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ?? ??????????.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectMenuNoByPk(MenuManageVO vo) throws Exception;

	int selectUpperMenuNoByPk(MenuManageVO vo) throws Exception;

	/**
	 * ??????
	 * 
	 * @param vo MenuManageVO
	 * @exception Exception
	 **/
	void insertMenuManage(MenuManageVO vo) throws Exception;

	/**
	 * ???????
	 * 
	 * @param vo MenuManageVO
	 * @exception Exception
	 **/
	void updateMenuManage(MenuManageVO vo) throws Exception;

	/**
	 * ?????????
	 * 
	 * @param vo MenuManageVO
	 * @exception Exception
	 **/
	void deleteMenuManage(MenuManageVO vo) throws Exception;

	/**
	 * ?????????????????? ????
	 * 
	 * @param checkedMenuNoForDel String
	 * @exception Exception
	 **/
	void deleteMenuManageList(String checkedMenuNoForDel) throws Exception;

	/* ???? ???*/

	/**
	 * ??????
	 * 
	 * @return List
	 * @exception Exception
	 **/
	List<MenuManageVO> selectMenuList() throws Exception;

	/* ### ?????? ### */
	/**
	 * MainMenu Head Menu ??
	 * 
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 **/
	List<?> selectMainMenuHead(MenuManageVO vo) throws Exception;

	/**
	 * MainMenu Head Left ??
	 * 
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 **/
	List<?> selectMainMenuLeft(MenuManageVO vo) throws Exception;

	/**
	 * MainMenu Head MenuURL ??
	 * 
	 * @param iMenuNo int
	 * @param sUniqId String
	 * @return String
	 * @exception Exception
	 **/
	String selectLastMenuURL(int iMenuNo, String sUniqId) throws Exception;

	/* ?????? */

	/**
	 * ???????? ??????? ????????? ????
	 * 
	 * @return boolean
	 **/
	boolean menuBndeAllDelete() throws Exception;

	/**
	 * ???? ??
	 * 
	 * @param vo          MenuManageVO
	 * @param inputStream InputStream
	 * @exception Exception
	 **/
	String menuBndeRegist(MenuManageVO vo, InputStream inputStream) throws Exception;

}
