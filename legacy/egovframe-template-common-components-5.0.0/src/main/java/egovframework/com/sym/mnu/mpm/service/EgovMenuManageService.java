package egovframework.com.sym.mnu.mpm.service;

import java.io.InputStream;
import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 硫붾돱愿由ъ뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
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

public interface EgovMenuManageService {

	/**
	 * 硫붾돱 ?곸꽭?뺣낫瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return MenuManageVO
	 * @exception Exception
	 */
	MenuManageVO selectMenuManage(ComDefaultVO vo) throws Exception;

	/**
     * 硫붾돱 紐⑸줉??議고쉶
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     */
    List<EgovMap> selectMenuManageList(ComDefaultVO vo) throws Exception;

	/**
	 * 硫붾돱紐⑸줉 珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectMenuManageListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * 硫붾돱踰덊샇 議댁옱 ?щ?瑜?議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectMenuNoByPk(MenuManageVO vo) throws Exception;

	int selectUpperMenuNoByPk(MenuManageVO vo) throws Exception;

	/**
	 * 硫붾돱 ?뺣낫瑜??깅줉
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	void insertMenuManage(MenuManageVO vo) throws Exception;

	/**
	 * 硫붾돱 ?뺣낫瑜??섏젙
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	void updateMenuManage(MenuManageVO vo) throws Exception;

	/**
	 * 硫붾돱 ?뺣낫瑜???젣
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	void deleteMenuManage(MenuManageVO vo) throws Exception;

	/**
	 * ?붾㈃??議고쉶??硫붾돱 紐⑸줉 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedMenuNoForDel String
	 * @exception Exception
	 */
	void deleteMenuManageList(String checkedMenuNoForDel) throws Exception;

	/*  硫붾돱 ?앹꽦 愿由? */

	/**
	 * 硫붾돱 紐⑸줉??議고쉶
	 * @return List
	 * @exception Exception
	 */
	List<EgovMap> selectMenuList() throws Exception;

	/*### 硫붾돱愿???꾨줈?몄뒪 ###*/
	/**
	 * MainMenu Head Menu 議고쉶
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 */
	List<?> selectMainMenuHead(MenuManageVO vo) throws Exception;

	/**
	 * MainMenu Head Left 議고쉶
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 */
	List<?> selectMainMenuLeft(MenuManageVO vo) throws Exception;

	/**
	 * MainMenu Head MenuURL 議고쉶
	 * @param iMenuNo int
	 * @param sUniqId String
	 * @return String
	 * @exception Exception
	 */
	String selectLastMenuURL(int iMenuNo, String sUniqId) throws Exception;

	/* ?쇨큵泥섎━ ?꾨줈?몄뒪   */

	/**
	 * 硫붾돱?쇨큵珥덇린???꾨줈?몄뒪 硫붾돱紐⑸줉?뚯씠釉? ?꾨줈洹몃옩 紐⑸줉?뚯씠釉??꾩껜 ??젣
	 * @return boolean
	 */
	boolean menuBndeAllDelete() throws Exception;

	/**
	 * 硫붾돱?쇨큵?깅줉 ?꾨줈?몄뒪
	 * @param  vo MenuManageVO
	 * @param  inputStream InputStream
	 * @exception Exception
	 */
	String menuBndeRegist(MenuManageVO vo, InputStream inputStream) throws Exception;

}
