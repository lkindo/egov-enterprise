package egovframework.com.sym.mnu.mcm.service;

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
 *
 * </pre>
 */
public interface EgovMenuCreateManageService {

	/**
	 * ID 議댁옱?щ?瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectUsrByPk(ComDefaultVO vo) throws Exception;

	/**
	 * ID?????沅뚰븳肄붾뱶瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	MenuCreatVO selectAuthorByUsr(ComDefaultVO vo) throws Exception;


	/**
     * 硫붾돱?앹꽦愿由?紐⑸줉??議고쉶
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     */
    List<EgovMap> selectMenuCreatManagList(ComDefaultVO vo) throws Exception;

	/**
	 * 硫붾돱?앹꽦愿由?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectMenuCreatManagTotCnt(ComDefaultVO vo) throws Exception;

	/**
     * 硫붾돱?앹꽦 ?댁뿭??議고쉶
     * 
     * @param vo MenuCreatVO
     * @return List
     * @exception Exception
     */
    List<EgovMap> selectMenuCreatList(MenuCreatVO vo) throws Exception;


	/**
	 * ?붾㈃??議고쉶??硫붾돱?뺣낫濡?硫붾돱?앹꽦?댁뿭 ?곗씠?곕쿋?댁뒪?먯꽌 ?낅젰
	 * @param checkedScrtyForInsert String
	 * @param checkedMenuNoForInsert String
	 * @exception Exception
	 */
	void insertMenuCreatList(String checkedScrtyForInsert, String checkedMenuNoForInsert) throws Exception;

	/**
	 * 硫붾돱?앹꽦 ?ъ씠?몃㏊ ?댁슜 議고쉶
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 */
	List<EgovMap> selectMenuCreatSiteMapList(MenuSiteMapVO vo) throws Exception;

	/**
	 * ?ъ슜??沅뚰븳蹂??ъ씠?몃㏊ ?댁슜 議고쉶
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 */
	 List<?> selectSiteMapByUser(MenuSiteMapVO vo) throws Exception;

	 /**
	 * ?ъ씠?몃㏊ ?깅줉
	 * 媛쒕컻?섍꼍?먯꽌 ?뚯뒪?몄슜 ?⑥닔濡?蹂댁븞 痍⑥빟
	 * @param vo MenuSiteMapVO
	 * @param vHtmlValue String
	 * @return boolean
	 * @exception Exception
	 */
	 //boolean creatSiteMap(MenuSiteMapVO vo, String vHtmlValue) throws Exception;
}
