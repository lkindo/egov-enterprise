package egovframework.com.sym.mnu.mcm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.mcm.service.EgovMenuCreateManageService;
import egovframework.com.sym.mnu.mcm.service.MenuCreatVO;
import egovframework.com.sym.mnu.mcm.service.MenuSiteMapVO;
import jakarta.annotation.Resource;

/**
 * 硫붾돱紐⑸줉, ?ъ씠?몃㏊ ?앹꽦??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜           理쒖큹 ?앹꽦
 *   2011.07.01  ?쒖???         EgovMenuManageServiceImpl?먯꽌 硫붾돱 ?앹꽦 愿??遺遺?遺꾨━
 *   2011.10.07  ?닿린??         finally臾몄쓣 異붽??섏뿬 ?먮윭???먯썝諛섑솚?????덈룄濡?異붽?
 *   2011.10.12  ?닿린??         ?ъ씠?몃㏊ ?앹꽦???뱀닔臾몄옄 移섑솚
 *   2025.07.16  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("meunCreateManageService")
public class EgovMenuCreateManageServiceImpl extends EgovAbstractServiceImpl implements EgovMenuCreateManageService {

	@Resource(name = "menuCreateManageDAO")
	private MenuCreateManageDAO menuCreateManageDAO;

	/**
	 * ID 議댁옱?щ?瑜?議고쉶
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectUsrByPk(ComDefaultVO vo) throws Exception {
		return menuCreateManageDAO.selectUsrByPk(vo);
	}

	/**
	 * 硫붾돱?앹꽦 ?댁뿭??議고쉶
	 * 
	 * @param vo MenuCreatVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectMenuCreatList(MenuCreatVO vo) throws Exception {
		return menuCreateManageDAO.selectMenuCreatList(vo);
	}

	/**
	 * ?붾㈃??議고쉶??硫붾돱?뺣낫濡?硫붾돱?앹꽦?댁뿭 ?곗씠?곕쿋?댁뒪?먯꽌 ?낅젰
	 * 
	 * @param checkedAuthorForInsert String
	 * @param checkedMenuNoForInsert String
	 * @exception Exception
	 */
	@Override
	public void insertMenuCreatList(String checkedAuthorForInsert, String checkedMenuNoForInsert) throws Exception {
		MenuCreatVO menuCreatVO = null;
		String[] insertMenuNo = checkedMenuNoForInsert.split(",");

		String insertAuthor = checkedAuthorForInsert;
		menuCreatVO = new MenuCreatVO();
		menuCreatVO.setAuthorCode(insertAuthor);
		int resultMenuCreatCnt = menuCreateManageDAO.selectMenuCreatCnt(menuCreatVO);

		// ?댁쟾??議댁옱?섎뒗 沅뚰븳肄붾뱶?????硫붾돱?ㅼ젙?댁뿭 ??젣
		if (resultMenuCreatCnt > 0) {
			menuCreateManageDAO.deleteMenuCreat(menuCreatVO);
		}
		for (int i = 0; i < insertMenuNo.length; i++) {
			menuCreatVO.setAuthorCode(insertAuthor);
			menuCreatVO.setMenuNo(Integer.parseInt(insertMenuNo[i]));
			menuCreateManageDAO.insertMenuCreat(menuCreatVO);
		}
	}

	/**
	 * 硫붾돱?앹꽦愿由?紐⑸줉??議고쉶
	 * 
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectMenuCreatManagList(ComDefaultVO vo) throws Exception {
		return menuCreateManageDAO.selectMenuCreatManagList(vo);
	}

	/**
	 * ID?????沅뚰븳肄붾뱶瑜?議고쉶
	 * 
	 * @param vo ComDefaultVO
	 * @return MenuCreatVO
	 * @exception Exception
	 */
	@Override
	public MenuCreatVO selectAuthorByUsr(ComDefaultVO vo) throws Exception {
		return menuCreateManageDAO.selectAuthorByUsr(vo);
	}

	/**
	 * 硫붾돱?앹꽦愿由?珥앷굔?섎? 議고쉶?쒕떎.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectMenuCreatManagTotCnt(ComDefaultVO vo) throws Exception {
		return menuCreateManageDAO.selectMenuCreatManagTotCnt(vo);
	}

	/**
	 * 硫붾돱?앹꽦 ?ъ씠?몃㏊ ?댁슜 議고쉶
	 * 
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectMenuCreatSiteMapList(MenuSiteMapVO vo) throws Exception {
		return menuCreateManageDAO.selectMenuCreatSiteMapList(vo);
	}

	/**
	 * ?ъ슜??沅뚰븳蹂??ъ씠?몃㏊ ?댁슜 議고쉶
	 * 
	 * @param vo MenuSiteMapVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<?> selectSiteMapByUser(MenuSiteMapVO vo) throws Exception {
		return menuCreateManageDAO.selectSiteMapByUser(vo);
	}

	/**
	 * ?ъ씠?몃㏊ ?깅줉 媛쒕컻?섍꼍?먯꽌 ?뚯뒪?몄슜 ?⑥닔濡?蹂댁븞 痍⑥빟
	 * 
	 * @param menuSiteMapvo MenuSiteMapVO
	 * @param vHtmlValue    String
	 * @return boolean
	 * @exception Exception
	 */
	/*
	 * public boolean creatSiteMap(MenuSiteMapVO menuSiteMapvo, String vHtmlValue)
	 * throws Exception { boolean chkCreat = false; String vSiteMapName = null; int
	 * SiteMapCnt = 0; //String newMapCreatId = null; MenuCreatVO menuCreatVO = new
	 * MenuCreatVO();
	 * 
	 * menuCreatVO.setMenuNo(menuSiteMapvo.getMenuNo());
	 * menuCreatVO.setAuthorCode(menuSiteMapvo.getAuthorCode()); //vSiteMapName =
	 * menuSiteMapvo.getTmp_rootPath()+"/"+menuSiteMapvo.getBndeFileNm();
	 * vSiteMapName = menuSiteMapvo.getTmpRootPath() +
	 * menuSiteMapvo.getBndeFilePath() + menuSiteMapvo.getBndeFileNm(); chkCreat =
	 * siteMapCreat(vSiteMapName, vHtmlValue); if (chkCreat) { SiteMapCnt =
	 * menuCreateManageDAO.selectSiteMapCnt(menuSiteMapvo); if (SiteMapCnt > 0) {
	 * menuCreatVO.setMapCreatId(menuSiteMapvo.getMapCreatId() +
	 * Integer.toString(SiteMapCnt));
	 * menuSiteMapvo.setMapCreatId(menuSiteMapvo.getMapCreatId() +
	 * Integer.toString(SiteMapCnt)); } else {
	 * menuCreatVO.setMapCreatId(menuSiteMapvo.getMapCreatId()); }
	 * menuCreateManageDAO.creatSiteMap(menuSiteMapvo);
	 * menuCreateManageDAO.updateMenuCreat(menuCreatVO);
	 * 
	 * } return chkCreat; }
	 */

	/**
	 * 硫붾돱?앹꽦 ?ъ씠?몃㏊ Html ?뚯씪 ?앹꽦 媛쒕컻?섍꼍?먯꽌 ?뚯뒪?몄슜 ?⑥닔濡?蹂댁븞 痍⑥빟
	 * 
	 * @param vSiteMapName String
	 * @param vHtmlValue   String
	 * @return boolean
	 * @exception Exception
	 */
	/*
	 * private boolean siteMapCreat(String vSiteMapName, String vHtmlValue) throws
	 * Exception { boolean success = false; String FileName = null; char
	 * FILE_SEPARATOR = File.separatorChar; BufferedWriter out = null; try {
	 * FileName = vSiteMapName.replace('\\', FILE_SEPARATOR).replace('/',
	 * FILE_SEPARATOR); File file = new
	 * File(EgovWebUtil.filePathBlackList(FileName)); out = new BufferedWriter(new
	 * FileWriter(file));
	 * 
	 * // ?ъ씠?몃㏊ ?앹꽦???뱀닔臾몄옄 移섑솚 vHtmlValue = vHtmlValue.replaceAll("&lt;", "<");
	 * vHtmlValue = vHtmlValue.replaceAll("&gt;", ">"); vHtmlValue =
	 * vHtmlValue.replaceAll("&quot;", "\""); vHtmlValue =
	 * vHtmlValue.replaceAll("&apos;", "'");
	 * 
	 * out.write(vHtmlValue); success = true; } catch (IOException e) {
	 * LOGGER.error("IOException", e); } finally {
	 * EgovResourceCloseHelper.close(out); }
	 * 
	 * return success; }
	 */
}