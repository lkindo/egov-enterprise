
package egovframework.com.sym.mnu.bmm.service;

import java.util.List;
import java.util.Map;

import egovframework.com.sym.mnu.mpm.service.MenuManageVO;

/**
 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜?愿由ы븯湲??꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
 * 
 * @author 怨듯넻而댄룷?뚰듃? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.09.25  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *   2025.07.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
public interface EgovBkmkMenuManageService {

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜???젣?쒕떎.
	 * 
	 * @param bkmkMenuManage
	 * @return
	 * @exception Exception
	 */
	public void deleteBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception;

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param BkmkMenuManage
	 * @return
	 * @exception Exception
	 */
	public void insertBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception;

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫???꾩껜紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param BkmkMenuManage
	 * @return Map<String, Object>
	 * @exception Exception
	 */
	public Map<String, Object> selectBkmkMenuManageList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param BkmkMenuManageVO
	 * @return BkmkMenuManageVO
	 * @exception Exception
	 */
	public BkmkMenuManageVO selectBkmkMenuManageResult(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * ?깅줉??硫붾돱?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param BkmkMenuManageVO
	 * @return Map<String, Object>
	 * @exception Exception
	 */
	public Map<String, Object> selectMenuList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * 誘몃━蹂닿린瑜???諛붾줈媛湲곕찓?닿?由ъ쓽 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param BkmkMenuManageVO
	 * @return List<MenuManageVO>
	 * @throws Exception
	 */
	public List<MenuManageVO> selectBkmkPreviewList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception;

	/**
	 * ?좏깮??硫붾돱??URL ??議고쉶?쒕떎.
	 *
	 * @param bkmkMenuManage
	 * @return
	 * @throws Exception
	 */
	public String selectUrl(BkmkMenuManage bkmkMenuManage) throws Exception;

}