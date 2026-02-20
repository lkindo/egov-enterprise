package egovframework.com.sym.mnu.mpm.service.impl;

import java.io.InputStream;
import java.sql.SQLException;
import java.util.List;

import org.apache.poi.hssf.usermodel.HSSFCell;
import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.CellType;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.BaseException;
import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.ProgrmManageVO;
import egovframework.com.sym.prm.service.impl.ProgrmManageDAO;
import jakarta.annotation.Resource;

/**
 * 硫붾돱紐⑸줉愿由? ?앹꽦, ?ъ씠?몃㏊??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?댁슜           理쒖큹 ?앹꽦
 *   2011.07.01  ?쒖???         ?먭린 硫붾돱 ?뺣낫瑜??곸쐞硫붾돱 ?뺣낫濡?李몄“?섎뒗 硫붾돱?뺣낫媛 ?덈뒗吏 議고쉶?섎뒗 selectUpperMenuNoByPk() 硫붿꽌??異붽?
 *   2017-02-13  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2019-12-06  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (遺?곸젅???덉쇅泥섎━)
 *   2025.07.18  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 WrapperObject ?앹꽦)
 *
 *      </pre>
 */
@Service("meunManageService")
public class EgovMenuManageServiceImpl extends EgovAbstractServiceImpl implements EgovMenuManageService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMenuManageServiceImpl.class);

	@Resource(name = "menuManageDAO")
	private MenuManageDAO menuManageDAO;
	@Resource(name = "progrmManageDAO")
	private ProgrmManageDAO progrmManageDAO;
	@Resource(name = "excelZipService")
	private EgovExcelService excelZipService;

	/**
	 * 硫붾돱 ?곸꽭?뺣낫瑜?議고쉶
	 * 
	 * @param vo ComDefaultVO
	 * @return MenuManageVO
	 * @exception Exception
	 */
	@Override
	public MenuManageVO selectMenuManage(ComDefaultVO vo) throws Exception {
		return menuManageDAO.selectMenuManage(vo);
	}

	/**
	 * 硫붾돱 紐⑸줉??議고쉶
	 * 
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectMenuManageList(ComDefaultVO vo) throws Exception {
		return menuManageDAO.selectMenuManageList(vo);
	}

	/**
	 * 硫붾돱紐⑸줉 珥앷굔?섎? 議고쉶?쒕떎.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectMenuManageListTotCnt(ComDefaultVO vo) throws Exception {
		return menuManageDAO.selectMenuManageListTotCnt(vo);
	}

	/**
	 * 硫붾돱踰덊샇瑜??곸쐞硫붾돱濡?李몄“?섍퀬 ?덈뒗 硫붾돱 議댁옱?щ?瑜?議고쉶
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectUpperMenuNoByPk(MenuManageVO vo) throws Exception {
		return menuManageDAO.selectUpperMenuNoByPk(vo);
	}

	/**
	 * 硫붾돱踰덊샇 議댁옱 ?щ?瑜?議고쉶?쒕떎.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectMenuNoByPk(MenuManageVO vo) throws Exception {
		return menuManageDAO.selectMenuNoByPk(vo);
	}

	/**
	 * 硫붾돱 ?뺣낫瑜??깅줉
	 * 
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	@Override
	public void insertMenuManage(MenuManageVO vo) throws Exception {
		menuManageDAO.insertMenuManage(vo);
	}

	/**
	 * 硫붾돱 ?뺣낫瑜??섏젙
	 * 
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	@Override
	public void updateMenuManage(MenuManageVO vo) throws Exception {
		menuManageDAO.updateMenuManage(vo);
	}

	/**
	 * 硫붾돱 ?뺣낫瑜???젣
	 * 
	 * @param vo MenuManageVO
	 * @exception Exception
	 */
	@Override
	public void deleteMenuManage(MenuManageVO vo) throws Exception {
		menuManageDAO.deleteMenuManage(vo);
	}

	/**
	 * ?붾㈃??議고쉶??硫붾돱 紐⑸줉 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * 
	 * @param checkedMenuNoForDel String
	 * @exception Exception
	 */
	@Override
	public void deleteMenuManageList(String checkedMenuNoForDel) throws Exception {
		MenuManageVO vo = null;

		String[] delMenuNo = checkedMenuNoForDel.split(",");

		if (delMenuNo == null || (delMenuNo.length == 0)) {
			throw new java.lang.Exception("String Split Error!");
		}
		for (String element : delMenuNo) {
			vo = new MenuManageVO();
			vo.setMenuNo(Integer.parseInt(element));
			menuManageDAO.deleteMenuManage(vo);
		}
	}

	/* 硫붾돱 ?앹꽦 愿由?*/

	/**
	 * 硫붾돱 紐⑸줉??議고쉶
	 * 
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectMenuList() throws Exception {
		return menuManageDAO.selectMenuList();
	}

	/* ### 硫붾돱愿???꾨줈?몄뒪 ### */
	/**
	 * MainMenu Head Menu 議고쉶
	 * 
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<?> selectMainMenuHead(MenuManageVO vo) throws Exception {
		return menuManageDAO.selectMainMenuHead(vo);
	}

	/**
	 * MainMenu Head Left 議고쉶
	 * 
	 * @param vo MenuManageVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<?> selectMainMenuLeft(MenuManageVO vo) throws Exception {
		return menuManageDAO.selectMainMenuLeft(vo);
	}

	/**
	 * MainMenu Head MenuURL 議고쉶
	 * 
	 * @param iMenuNo int
	 * @param sUniqId String
	 * @return String
	 * @exception Exception
	 */
	@Override
	public String selectLastMenuURL(int iMenuNo, String sUniqId) throws Exception {
		MenuManageVO vo = new MenuManageVO();
		vo.setMenuNo(selectLastMenuNo(iMenuNo, sUniqId));
		return menuManageDAO.selectLastMenuURL(vo);
	}

	/**
	 * MainMenu Head Menu MenuNo 議고쉶
	 * 
	 * @param iMenuNo int
	 * @param sUniqId String
	 * @return String
	 * @exception Exception
	 */
	private int selectLastMenuNo(int iMenuNo, String sUniqId) throws Exception {
		int chkMenuNo = iMenuNo;
		int cntMenuNo = 0;
		for (; chkMenuNo > -1;) {
			chkMenuNo = selectLastMenuNoChk(chkMenuNo, sUniqId);
			if (chkMenuNo > 0) {
				cntMenuNo = chkMenuNo;
			}
		}
		return cntMenuNo;
	}

	/**
	 * MainMenu Head Menu Last MenuNo 議고쉶
	 * 
	 * @param iMenuNo int
	 * @param sUniqId String
	 * @return String
	 * @exception Exception
	 */
	private int selectLastMenuNoChk(int iMenuNo, String sUniqId) throws Exception {
		MenuManageVO vo = new MenuManageVO();
		vo.setMenuNo(iMenuNo);
		vo.setTempValue(sUniqId);
		int chkMenuNo = 0;
		int cntMenuNo = 0;
		cntMenuNo = menuManageDAO.selectLastMenuNoCnt(vo);
		if (cntMenuNo > 0) {
			chkMenuNo = menuManageDAO.selectLastMenuNo(vo);
		} else {
			chkMenuNo = -1;
		}
		return chkMenuNo;
	}

	/* ### ?쇨큵泥섎━ ?꾨줈?몄뒪 ### */
	/**
	 * 硫붾돱?쇨큵珥덇린???꾨줈?몄뒪 硫붾돱紐⑸줉?뚯씠釉? ?꾨줈洹몃옩 紐⑸줉?뚯씠釉??꾩껜 ??젣
	 * 
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	public boolean menuBndeAllDelete() throws Exception {
		if (!deleteAllProgrmDtls()) {
			return false;
		} // ?꾨줈洹몃옩蹂寃쎌슂泥??뚯씠釉?
		if (!deleteAllMenuList()) {
			return false;
		} // 硫붾돱?뺣낫 ?뚯씠釉?
		if (!deleteAllProgrm()) {
			return false;
		} // ?꾨줈洹몃옩紐⑸줉 ?뚯씠釉?
		return true;
	}

	/**
	 * 硫붾돱?쇨큵?깅줉 ?꾨줈?몄뒪
	 * 
	 * @param vo          MenuManageVO
	 * @param inputStream InputStream
	 * @exception Exception
	 */
	@Override
	public String menuBndeRegist(MenuManageVO vo, InputStream inputStream) throws Exception {

		String message = bndeRegist(inputStream);
		String sMessage = null;

		switch (Integer.parseInt(message)) {
		case 99:
			LOGGER.debug("?꾨줈洹몃옩紐⑸줉/硫붾돱?뺣낫?뚯씠釉??곗씠? 議댁옱?ㅻ쪟 - 珥덇린???섏떊 ???ㅼ떆 泥섎━?섏꽭??");
			sMessage = "?꾨줈洹몃옩紐⑸줉/硫붾돱?뺣낫?뚯씠釉??곗씠? 議댁옱?ㅻ쪟 - 珥덇린???섏떊 ???ㅼ떆 泥섎━?섏꽭??";
			break;
		case 90:
			LOGGER.debug("?뚯씪議댁옱?섏? ?딆쓬.");
			sMessage = "?뚯씪議댁옱?섏? ?딆쓬.";
			break;
		case 91:
			LOGGER.debug("?꾨줈洹몃옩?쒗듃??cell 媛쒖닔 ?ㅻ쪟.");
			sMessage = "?꾨줈洹몃옩?쒗듃??cell 媛쒖닔 ?ㅻ쪟.";
			break;
		case 92:
			LOGGER.debug("硫붾돱?뺣낫?쒗듃??cell 媛쒖닔 ?ㅻ쪟.");
			sMessage = "硫붾돱?뺣낫?쒗듃??cell 媛쒖닔 ?ㅻ쪟.";
			break;
		case 93:
			LOGGER.debug("?묒? ?쒗듃媛쒖닔 ?ㅻ쪟.");
			sMessage = "?묒? ?쒗듃媛쒖닔 ?ㅻ쪟.";
			break;
		case 95:
			LOGGER.debug("硫붾돱?뺣낫 ?낅젰???먮윭.");
			sMessage = "硫붾돱?뺣낫 ?낅젰???먮윭.";
			break;
		case 96:
			LOGGER.debug("?꾨줈洹몃옩紐⑸줉?낅젰???먮윭.");
			sMessage = "?꾨줈洹몃옩紐⑸줉?낅젰???먮윭.";
			break;
		default:
			LOGGER.debug("?쇨큵諛곗튂泥섎━ ?꾨즺.");
			sMessage = "?쇨큵諛곗튂泥섎━ ?꾨즺.";
			break;
		}
		LOGGER.debug(message);
		return sMessage;
	}

	/**
	 * 硫붾돱紐⑸줉_?꾨줈洹몃옩紐⑸줉 ?쇨큵?앹꽦
	 * 
	 * @param inputStream InputStream
	 * @return String
	 * @exception Exception
	 */
	private String bndeRegist(InputStream inputStream) throws Exception {
		boolean success = false;
		String requestValue = null;
		int progrmSheetRowCnt = 0;
		int menuSheetRowCnt = 0;
		// String xlsFile = null;
		try {
			/*
			 * ?ㅻ쪟 硫붿꽭吏 ?뺣낫 message = "99"; //?꾨줈洹몃옩紐⑸줉?뚯씠釉??곗씠? 議댁옱?ㅻ쪟. message = "99"; //硫붾돱?뺣낫?뚯씠釉??곗씠?
			 * 議댁옱?ㅻ쪟. message = "90"; //?뚯씪議댁옱?섏? ?딆쓬. message = "91"; //?꾨줈洹몃옩?쒗듃??cell 媛쒖닔 ?ㅻ쪟
			 * message = "92"; //硫붾돱?뺣낫?쒗듃??cell 媛쒖닔 ?ㅻ쪟 message = "93"; //?묒? ?쒗듃媛쒖닔 ?ㅻ쪟 message =
			 * "95"; //硫붾돱?뺣낫 ?낅젰???먮윭 message = "96"; //?꾨줈洹몃옩紐⑸줉?낅젰???먮윭 message = "0"; //?쇨큵諛곗튂泥섎━ ?꾨즺
			 */

			if (progrmManageDAO.selectProgrmListTotCnt() > 0) {
				return requestValue = "99";
			} // ?꾨줈洹몃옩紐⑸줉?뚯씠釉??곗씠? 議댁옱?ㅻ쪟.
			if (menuManageDAO.selectMenuListTotCnt() > 0) {
				return requestValue = "99";
			} // 硫붾돱?뺣낫?뚯씠釉??곗씠? 議댁옱?ㅻ쪟.

			HSSFWorkbook hssfWB = (HSSFWorkbook) excelZipService.loadWorkbook(inputStream);
			// ?묒? ?뚯씪 ?쒗듃 媛쒖닔 ?뺤씤 sheet = 2 泥ル쾲吏몄떆??= ?꾨줈洹몃옩紐⑸줉 ?먮쾲吏몄떆??= 硫붾돱紐⑸줉
			if (hssfWB.getNumberOfSheets() == 2) {
				HSSFSheet progrmSheet = hssfWB.getSheetAt(0); // ?꾨줈洹몃옩紐⑸줉 ?쒗듃 媛?몄삤湲?
				HSSFSheet menuSheet = hssfWB.getSheetAt(1); // 硫붾돱?뺣낫 ?쒗듃 媛?몄삤湲?
				HSSFRow progrmRow = progrmSheet.getRow(1); // ?꾨줈洹몃옩 row 媛?몄삤湲?
				HSSFRow menuRow = menuSheet.getRow(1); // 硫붾돱?뺣낫 row 媛?몄삤湲?
				progrmSheetRowCnt = progrmRow.getPhysicalNumberOfCells(); // ?꾨줈洹몃옩 cell Cnt
				menuSheetRowCnt = menuRow.getPhysicalNumberOfCells(); // 硫붾돱?뺣낫 cell Cnt

				// ?꾨줈洹몃옩 ?쒗듃 ?뚯씪 ?곗씠? 寃利?cell = 5媛?
				if (progrmSheetRowCnt != 5) {
					return requestValue = "91"; // ?꾨줈洹몃옩?쒗듃??cell 媛쒖닔 ?ㅻ쪟
				}

				// 硫붾돱紐⑸줉 ?쒗듃 ?뚯씪 ?곗씠? 寃利?cell = 8媛?
				if (menuSheetRowCnt != 8) {
					return requestValue = "92"; // 硫붾돱?뺣낫?쒗듃??cell 媛쒖닔 ?ㅻ쪟
				}

				/* sheet1踰?= ?꾨줈洹몃옩紐⑸줉 , sheet2踰?= 硫붾돱?뺣낫 */
				success = progrmRegist(progrmSheet);
				if (success) {
					success = menuRegist(menuSheet);
					if (success) {
						return requestValue = "0"; // ?쇨큵諛곗튂泥섎━ ?꾨즺
					} else {
						deleteAllProgrmDtls();
						deleteAllProgrm();
						deleteAllMenuList();
						return requestValue = "95"; // 硫붾돱?뺣낫 ?낅젰???먮윭
					}
				} else {
					deleteAllProgrmDtls();
					deleteAllProgrm();
					return requestValue = "96"; // ?꾨줈洹몃옩紐⑸줉?낅젰???먮윭
				}
			} else {
				return requestValue = "93"; // ?묒? ?쒗듃媛쒖닔 ?ㅻ쪟
			}
		} catch (BaseException e) {
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			requestValue = "99";

		} catch (Exception e) {
			// 2017.02.13 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			requestValue = "99";
		}
		return requestValue;
	}

	/**
	 * ?꾨줈洹몃옩紐⑸줉 ?쇨큵?깅줉
	 * 
	 * @param progrmSheet HSSFSheet
	 * @return boolean
	 * @exception Exception
	 */
	private boolean progrmRegist(HSSFSheet progrmSheet) {
		int count = 0;
		boolean success = false;
		try {
			int rows = progrmSheet.getPhysicalNumberOfRows(); // ??媛쒖닔 媛?몄삤湲?
			for (int j = 1; j < rows; j++) { // row 猷⑦봽
				ProgrmManageVO vo = new ProgrmManageVO();
				HSSFRow row = progrmSheet.getRow(j); // row 媛?몄삤湲?
				if (row != null) {
					// int cells = row.getPhysicalNumberOfCells(); //cell 媛쒖닔 媛?몄삤湲?

					HSSFCell cell = null;
					cell = row.getCell(0); // ?꾨줈洹몃옩紐?
					if (cell != null) {
						vo.setProgrmFileNm("" + cell.getStringCellValue());
					}
					cell = row.getCell(1); // ?꾨줈洹몃옩?쒓?紐?
					if (cell != null) {
						vo.setProgrmKoreanNm("" + cell.getStringCellValue());
					}
					cell = row.getCell(2); // ?꾨줈洹몃옩??κ꼍濡?
					if (cell != null) {
						vo.setProgrmStrePath("" + cell.getStringCellValue());
					}
					cell = row.getCell(3); // ?꾨줈洹몃옩 URL
					if (cell != null) {
						vo.setURL("" + cell.getStringCellValue());
					}
					cell = row.getCell(4); // ?꾨줈洹몃옩?ㅻ챸
					if (cell != null) {
						vo.setProgrmDc("" + cell.getStringCellValue());
					}
				}
				if (insertProgrm(vo)) {
					count++;
				}
			}
			if (count == rows - 1) {
				success = true;
			} else {
				success = false;
			}
		} catch (SQLException e) {
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			success = false;

		} catch (Exception e) {
			// 2017.02.13 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			success = false;
		}
		return success;
	}

	/**
	 * 硫붾돱?뺣낫 ?쇨큵?깅줉
	 * 
	 * @param menuSheet HSSFSheet
	 * @return boolean
	 * @exception Exception
	 */
	private boolean menuRegist(HSSFSheet menuSheet) throws Exception {
		boolean success = false;
		int count = 0;
		try {
			int rows = menuSheet.getPhysicalNumberOfRows(); // ??媛쒖닔 媛?몄삤湲?
			for (int j = 1; j < rows; j++) { // row 猷⑦봽
				MenuManageVO vo = new MenuManageVO();
				HSSFRow row = menuSheet.getRow(j); // row 媛?몄삤湲?
				if (row != null) {
					// int cells = row.getPhysicalNumberOfCells(); //cell 媛쒖닔 媛?몄삤湲?
					HSSFCell cell = null;
					cell = row.getCell(0); // 硫붾돱踰덊샇
					if (cell != null && cell.getCellType() == CellType.NUMERIC) {
						vo.setMenuNo((int) cell.getNumericCellValue());
					}
					cell = row.getCell(1); // 硫붾돱?쒖꽌
					if (cell != null && cell.getCellType() == CellType.NUMERIC) {
						vo.setMenuOrdr((int) cell.getNumericCellValue());
					}
					cell = row.getCell(2); // 硫붾돱紐?
					if (cell != null) {
						vo.setMenuNm("" + cell.getStringCellValue());
					}
					cell = row.getCell(3); // ?곸쐞硫붾돱踰덊샇
					if (cell != null && cell.getCellType() == CellType.NUMERIC) {
						vo.setUpperMenuId((int) cell.getNumericCellValue());
					}
					cell = row.getCell(4); // 硫붾돱?ㅻ챸
					if (cell != null) {
						vo.setMenuDc("" + cell.getStringCellValue());
					}
					cell = row.getCell(5); // 愿?⑥씠誘몄?寃쎈줈
					if (cell != null) {
						vo.setRelateImagePath("" + cell.getStringCellValue());
					}
					cell = row.getCell(6); // 愿?⑥씠誘몄?紐?
					if (cell != null) {
						vo.setRelateImageNm("" + cell.getStringCellValue());
					}
					cell = row.getCell(7); // ?꾨줈洹몃옩?뚯씪紐?
					if (cell != null) {
						vo.setProgrmFileNm("" + cell.getStringCellValue());
					}
				}
				if (insertMenuManageBind(vo)) {
					count++;
				}
			}
			if (count == rows - 1) {
				success = true;
			} else {
				success = false;
			}
		} catch (SQLException e) {
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			success = false;

		} catch (Exception e) {
			// 2017.02.13 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			success = false;
		}

		return success;
	}

	/**
	 * 硫붾돱?뺣낫 ?꾩껜?곗씠? 珥덇린??
	 * 
	 * @return boolean
	 * @exception Exception
	 */
	private boolean deleteAllMenuList() throws Exception {
		return menuManageDAO.deleteAllMenuList();
	}

	/**
	 * ?꾨줈洹몃옩 ?뺣낫瑜??깅줉
	 * 
	 * @param vo ProgrmManageVO
	 * @return boolean
	 * @exception Exception
	 */
	private boolean insertProgrm(ProgrmManageVO vo) throws Exception {
		progrmManageDAO.insertProgrm(vo);
		return true;
	}

	/**
	 * 硫붾돱?뺣낫瑜??쇨큵 ?깅줉
	 * 
	 * @param vo MenuManageVO
	 * @return boolean
	 * @exception Exception
	 */
	private boolean insertMenuManageBind(MenuManageVO vo) throws Exception {
		menuManageDAO.insertMenuManage(vo);
		return true;
	}

	/**
	 * ?꾨줈洹몃옩 ?뺣낫 ?꾩껜?곗씠? 珥덇린??
	 * 
	 * @return boolean
	 * @exception Exception
	 */
	private boolean deleteAllProgrm() throws Exception {
		return progrmManageDAO.deleteAllProgrm();
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎈궡???뺣낫 ?꾩껜?곗씠? 珥덇린??
	 * 
	 * @return boolean
	 * @exception Exception
	 */
	private boolean deleteAllProgrmDtls() throws Exception {
		return progrmManageDAO.deleteAllProgrmDtls();
	}
}