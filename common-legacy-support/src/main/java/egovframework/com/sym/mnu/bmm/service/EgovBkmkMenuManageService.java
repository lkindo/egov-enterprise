
package egovframework.com.sym.mnu.bmm.service;

import java.util.List;
import java.util.Map;

import egovframework.com.sym.mnu.mpm.service.MenuManageVO;

/**
 * ????????????? ??????????????
 * 
 * @author ?????? ???
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.09.25  ???         ????
 *   2025.07.15  ????         2025????????PMD???????? ????????-FormalParameterNamingConventions(?????????
 *
 *      </pre>
 **/
public interface EgovBkmkMenuManageService {

	/**
	 * ??????????????.
	 * 
	 * @param bkmkMenuManage
	 * @return
	 * @exception Exception
	 **/
	public void deleteBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception;

	/**
	 * ????????????.
	 * 
	 * @param BkmkMenuManage
	 * @return
	 * @exception Exception
	 **/
	public void insertBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception;

	/**
	 * ???????????????.
	 * 
	 * @param BkmkMenuManage
	 * @return Map<String, Object>
	 * @exception Exception
	 **/
	public Map<String, Object> selectBkmkMenuManageList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * ????????????.
	 * 
	 * @param BkmkMenuManageVO
	 * @return BkmkMenuManageVO
	 * @exception Exception
	 **/
	public BkmkMenuManageVO selectBkmkMenuManageResult(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * ????? ?????.
	 * 
	 * @param BkmkMenuManageVO
	 * @return Map<String, Object>
	 * @exception Exception
	 **/
	public Map<String, Object> selectMenuList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * ??????????? ?????.
	 *
	 * @param BkmkMenuManageVO
	 * @return List<MenuManageVO>
	 * @throws Exception
	 **/
	public List<MenuManageVO> selectBkmkPreviewList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * ??????URL ?????.
	 *
	 * @param bkmkMenuManage
	 * @return
	 * @throws Exception
	 **/
	public String selectUrl(BkmkMenuManage bkmkMenuManage) throws Exception;

}
