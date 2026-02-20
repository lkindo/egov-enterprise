package egovframework.com.uss.ion.bnt.service.impl;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.apache.poi.hssf.usermodel.HSSFCell;
import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.bnt.service.BndtCeckManage;
import egovframework.com.uss.ion.bnt.service.BndtCeckManageVO;
import egovframework.com.uss.ion.bnt.service.BndtDiary;
import egovframework.com.uss.ion.bnt.service.BndtDiaryVO;
import egovframework.com.uss.ion.bnt.service.BndtManage;
import egovframework.com.uss.ion.bnt.service.BndtManageVO;
import egovframework.com.uss.ion.bnt.service.EgovBndtManageService;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - ?뱀쭅愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뱀쭅愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?뱀쭅愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?댁슜
 * @since 2010.06.15
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.15  ?쒖??꾨젅?꾩썙??    理쒖큹 ?앹꽦
 *   2018.08.29  ?좎슜??         xlsx 泥섎━ ?좎닔 ?덈룄濡?selectBndtManageBndeX異붽?
 *   2020.11.02  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 - ??null) 媛?泥댄겕
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.08.04  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.08.04  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("egovBndtManageService")
public class EgovBndtManageServiceImpl extends EgovAbstractServiceImpl implements EgovBndtManageService {

	@Resource(name = "excelZipService")
	private EgovExcelService excelZipService;

	@Resource(name = "bndtManageDAO")
	private BndtManageDAO bndtManageDAO;

	/**
	 * ?뱀쭅愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???뱀쭅愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return List - ?뱀쭅愿由?紐⑸줉
	 */
	@Override
	public List<BndtManageVO> selectBndtManageList(BndtManageVO bndtManageVO) throws Exception {
		return bndtManageDAO.selectBndtManageList(bndtManageVO);
	}

	/**
	 * ?뱀쭅愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return int - ?뱀쭅愿由?移댁슫????
	 */
	@Override
	public int selectBndtManageListTotCnt(BndtManageVO bndtManageVO) throws Exception {
		return bndtManageDAO.selectBndtManageListTotCnt(bndtManageVO);
	}

	/**
	 * ?깅줉???뱀쭅愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return BndtManageVO - ?뱀쭅愿由?VO
	 */
	@Override
	public BndtManageVO selectBndtManage(BndtManageVO bndtManageVO) throws Exception {
		bndtManageVO.setBndtDe(EgovStringUtil.removeMinusChar(bndtManageVO.getBndtDe()));
		BndtManageVO bndtManageVOTemp = new BndtManageVO();
		bndtManageVOTemp = bndtManageDAO.selectBndtManage(bndtManageVO);
		bndtManageVOTemp.setBndtDe(EgovDateUtil.formatDate(bndtManageVOTemp.getBndtDe(), "-"));

		return bndtManageVOTemp;
	}

	/**
	 * ?뱀쭅愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	@Override
	public void insertBndtManage(BndtManage bndtManage) throws Exception {
		bndtManage.setBndtDe(EgovStringUtil.removeMinusChar(bndtManage.getBndtDe()));
		bndtManageDAO.insertBndtManage(bndtManage);
	}

	/**
	 * 湲??깅줉???뱀쭅愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	@Override
	public void updtBndtManage(BndtManage bndtManage) throws Exception {
		bndtManage.setBndtDe(EgovStringUtil.removeMinusChar(bndtManage.getBndtDe()));
		bndtManageDAO.updtBndtManage(bndtManage);
	}

	/**
	 * 湲??깅줉???뱀쭅愿由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	@Override
	public void deleteBndtManage(BndtManage bndtManage) throws Exception {
		bndtManage.setBndtDe(EgovStringUtil.removeMinusChar(bndtManage.getBndtDe()));
		bndtManageDAO.deleteBndtManage(bndtManage);
	}

	/**
	 * ?뱀쭅?쇱? 媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param bndtManage - ?뱀쭅愿由?
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectBndtDiaryTotCnt(BndtManage bndtManage) throws Exception {
		bndtManage.setBndtDe(EgovStringUtil.removeMinusChar(bndtManage.getBndtDe()));
		return bndtManageDAO.selectBndtDiaryTotCnt(bndtManage);
	}

	/***** ?뱀쭅 泥댄겕愿由?*****/

	/**
	 * ?뱀쭅泥댄겕愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???뱀쭅泥댄겕愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return List - ?뱀쭅泥댄겕愿由?紐⑸줉
	 */
	@Override
	public List<BndtCeckManageVO> selectBndtCeckManageList(BndtCeckManageVO bndtCeckManageVO) throws Exception {
		return bndtManageDAO.selectBndtCeckManageList(bndtCeckManageVO);
	}

	/**
	 * ?뱀쭅泥댄겕愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return int - ?뱀쭅泥댄겕愿由?移댁슫????
	 */
	@Override
	public int selectBndtCeckManageListTotCnt(BndtCeckManageVO bndtCeckManageVO) throws Exception {
		return bndtManageDAO.selectBndtCeckManageListTotCnt(bndtCeckManageVO);
	}

	/**
	 * ?깅줉???뱀쭅泥댄겕愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return BndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 */
	@Override
	public BndtCeckManageVO selectBndtCeckManage(BndtCeckManageVO bndtCeckManageVO) throws Exception {
		return bndtManageDAO.selectBndtCeckManage(bndtCeckManageVO);
	}

	/**
	 * ?뱀쭅泥댄겕愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	@Override
	public void insertBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		bndtManageDAO.insertBndtCeckManage(bndtCeckManage);
	}

	/**
	 * 湲??깅줉???뱀쭅泥댄겕愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	@Override
	public void updtBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		bndtManageDAO.updtBndtCeckManage(bndtCeckManage);
	}

	/**
	 * 湲??깅줉???뱀쭅泥댄겕愿由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	@Override
	public void deleteBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		bndtManageDAO.deleteBndtCeckManage(bndtCeckManage);
	}

	/**
	 * ?뱀쭅泥댄겕 以묐났?щ? 議고쉶?쒕떎.
	 * 
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectBndtCeckManageDplctAt(BndtCeckManage bndtCeckManage) throws Exception {
		return bndtManageDAO.selectBndtCeckManageDplctAt(bndtCeckManage);
	}

	/***** ?뱀쭅 ?쇱? *****/

	/**
	 * ?깅줉???뱀쭅?쇱?愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param bndtDiaryVO - ?뱀쭅?쇱?愿由?VO
	 * @return BndtDiaryVO - ?뱀쭅?쇱?愿由?VO
	 */
	@Override
	public List<BndtDiaryVO> selectBndtDiary(BndtDiaryVO bndtDiaryVO) throws Exception {
		return bndtManageDAO.selectBndtDiary(bndtDiaryVO);
	}

	/**
	 * ?뱀쭅?쇱?愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param bndtDiary    - ?뱀쭅?쇱?愿由?model
	 * @param diaryForUpdt - String
	 */
	@Override
	public void insertBndtDiary(BndtDiary bndtDiary, String diaryForInsert) throws Exception {

		BndtDiary bndtDiaryTemp;
		String[] bndtDiaryValues = diaryForInsert.split("[@]");
		String[] sTempBndtDiary;
		for (String sTemp : bndtDiaryValues) {
			bndtDiaryTemp = new BndtDiary();
			sTempBndtDiary = sTemp.split("[$]");
			bndtDiaryTemp.setBndtDe(bndtDiary.getBndtDe());
			bndtDiaryTemp.setBndtId(bndtDiary.getBndtId());
			bndtDiaryTemp.setBndtCeckSe(sTempBndtDiary[0]);
			bndtDiaryTemp.setBndtCeckCd(sTempBndtDiary[1]);
			bndtDiaryTemp.setChckSttus(sTempBndtDiary[2]);
			bndtDiaryTemp.setFrstRegisterId(bndtDiary.getFrstRegisterId());

			bndtManageDAO.insertBndtDiary(bndtDiaryTemp);
		}
	}

	/**
	 * 湲??깅줉???뱀쭅?쇱?愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param bndtDiary    - ?뱀쭅?쇱?愿由?model
	 * @param diaryForUpdt - String
	 */
	@Override
	public void updtBndtDiary(BndtDiary bndtDiary, String diaryForUpdt) throws Exception {

		BndtDiary bndtDiaryTemp;
		String[] bndtDiaryValues = diaryForUpdt.split("[@]");
		String[] sTempBndtDiary;
		for (String sTemp : bndtDiaryValues) {
			bndtDiaryTemp = new BndtDiary();
			sTempBndtDiary = sTemp.split("[$]");
			bndtDiaryTemp.setBndtDe(bndtDiary.getBndtDe());
			bndtDiaryTemp.setBndtId(bndtDiary.getBndtId());
			bndtDiaryTemp.setBndtCeckSe(sTempBndtDiary[0]);
			bndtDiaryTemp.setBndtCeckCd(sTempBndtDiary[1]);
			bndtDiaryTemp.setChckSttus(sTempBndtDiary[2]);
			bndtDiaryTemp.setLastUpdusrId(bndtDiary.getLastUpdusrId());

			bndtManageDAO.updtBndtDiary(bndtDiaryTemp);
		}
	}

	/**
	 * 湲??깅줉???뱀쭅?쇱?愿由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param bndtDiary - ?뱀쭅?쇱?愿由?model
	 */
	@Override
	public void deleteBndtDiary(BndtDiary bndtDiary) throws Exception {
		bndtManageDAO.deleteBndtDiary(bndtDiary);
	}

	/* ### ?묒? ?쇨큵泥섎━ ?꾨줈?몄뒪 ### */

	/**
	 * ?뱀쭅??excel?앹꽦
	 * 
	 * @param inputStream InputStream
	 * @return String
	 * @exception Exception
	 */
	@Override
	public List<BndtManageVO> selectBndtManageBnde(InputStream inputStream) throws Exception {
//	    int bndtSheetRowCnt = 0;
//	    String xlsFile = null;
		String sTempNm = null;
		String sTempId = null;

	    List<BndtManageVO> list = new ArrayList<>();

		String sBndtDe = null;
		HSSFWorkbook hssfWB = (HSSFWorkbook) excelZipService.loadWorkbook(inputStream);
		// ?묒? ?뚯씪 ?쒗듃 媛쒖닔 ?뺤씤 sheet = 1
		if (hssfWB.getNumberOfSheets() == 1) {
			HSSFSheet bndtSheet = hssfWB.getSheetAt(0); // ?뱀쭅???쒗듃 媛?몄삤湲?
//            HSSFRow   bndtRow    = bndtSheet.getRow(1); //?뱀쭅??row 媛?몄삤湲?
//            bndtSheetRowCnt      = bndtRow.getPhysicalNumberOfCells(); //?뱀쭅??cell Cnt
			int rowsCnt = bndtSheet.getPhysicalNumberOfRows(); // ??媛쒖닔 媛?몄삤湲?

			BndtManageVO checkBndtManageVO = new BndtManageVO();
			for (int j = 1; j < rowsCnt; j++) { // row 猷⑦봽
				BndtManageVO bndtManageVO = new BndtManageVO();
				HSSFRow row = bndtSheet.getRow(j); // row 媛?몄삤湲?
				if (row != null) {
//                    int cells = row.getPhysicalNumberOfCells(); //cell 媛쒖닔 媛?몄삤湲?
					HSSFCell cell = null;
					cell = row.getCell(0); // ?뱀쭅?쇱옄
					if (cell != null) {
						sBndtDe = cell.getStringCellValue();
					}
					cell = row.getCell(1); // ?뱀쭅?륤D
					if (cell != null) {
						sTempId = cell.getStringCellValue();
					}
					cell = row.getCell(2); // ?뱀쭅?먮챸
					if (cell != null) {
						sTempNm = cell.getStringCellValue();
					}
					checkBndtManageVO.setTempBndtNm(sTempNm); // ?뱀쭅?륤D
					checkBndtManageVO.setTempBndtId(sTempId); // ?뱀쭅?먮챸

					// 理쒕몢??濡쒖쭅蹂寃?
					bndtManageVO = bndtManageDAO.selectBndtManageBnde(checkBndtManageVO);
					if (bndtManageVO == null) {
						bndtManageVO = new BndtManageVO();
						BeanUtils.copyProperties(checkBndtManageVO, bndtManageVO);
					}

					bndtManageVO.setBndtDe(sBndtDe);
					bndtManageVO.setDateWeek(getDateWeekInt(sBndtDe));
					bndtManageVO.setTempBndtWeek(getDateWeekString(sBndtDe));

					list.add(bndtManageVO);
				}
			}
		}

		return list;
	}

	/* ### ?묒? ?쇨큵泥섎━ ?꾨줈?몄뒪 ### */

	/**
	 * ?뱀쭅??excel?앹꽦 (Xlsx 泥섎━)
	 * 
	 * @param inputStream InputStream
	 * @return String
	 * @exception Exception
	 */
	@Override
	public List<BndtManageVO> selectBndtManageBndeX(InputStream inputStream) throws Exception {
//	    int bndtSheetRowCnt = 0;
//	    String xlsFile = null;
		String sTempNm = null;
		String sTempId = null;

		List<BndtManageVO> list = new ArrayList<BndtManageVO>();

		String sBndtDe = null;
		try (Workbook workbook = new XSSFWorkbook(inputStream);) {
			// ?묒? ?뚯씪 ?쒗듃 媛쒖닔 ?뺤씤 sheet = 1
			if (workbook != null && workbook.getNumberOfSheets() == 1) {
				Sheet bndtSheet = workbook.getSheetAt(0); // ?뱀쭅???쒗듃 媛?몄삤湲?
//	            XSSFRow   bndtRow    = bndtSheet.getRow(1); //?뱀쭅??row 媛?몄삤湲?
//	            bndtSheetRowCnt      = bndtRow.getPhysicalNumberOfCells(); //?뱀쭅??cell Cnt
				int rowsCnt = bndtSheet.getPhysicalNumberOfRows(); // ??媛쒖닔 媛?몄삤湲?

				BndtManageVO checkBndtManageVO = new BndtManageVO();
				for (int j = 1; j < rowsCnt; j++) { // row 猷⑦봽
					BndtManageVO bndtManageVO = new BndtManageVO();
					Row row = bndtSheet.getRow(j); // row 媛?몄삤湲?
					if (row != null) {
//	                    int cells = row.getPhysicalNumberOfCells(); //cell 媛쒖닔 媛?몄삤湲?
						Cell cell = null;
						cell = row.getCell(0); // ?뱀쭅?쇱옄
						if (cell != null) {
							sBndtDe = cell.getStringCellValue();
						}
						cell = row.getCell(1); // ?뱀쭅?륤D
						if (cell != null) {
							sTempId = cell.getStringCellValue();
						}
						cell = row.getCell(2); // ?뱀쭅?먮챸
						if (cell != null) {
							sTempNm = cell.getStringCellValue();
						}
						checkBndtManageVO.setTempBndtNm(sTempNm); // ?뱀쭅?륤D
						checkBndtManageVO.setTempBndtId(sTempId); // ?뱀쭅?먮챸

						// 理쒕몢??濡쒖쭅蹂寃?
						bndtManageVO = bndtManageDAO.selectBndtManageBnde(checkBndtManageVO);
						if (bndtManageVO == null) {
							bndtManageVO = new BndtManageVO();
							BeanUtils.copyProperties(checkBndtManageVO, bndtManageVO);
						}

						bndtManageVO.setBndtDe(sBndtDe);
						bndtManageVO.setDateWeek(getDateWeekInt(sBndtDe));
						bndtManageVO.setTempBndtWeek(getDateWeekString(sBndtDe));

						list.add(bndtManageVO);
					}
				}
			}
		} catch (IOException e) { // KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			throw new UncheckedIOException(e);
		}

		return list;
	}

	/**
	 * ?뱀쭅?뺣낫瑜??쇨큵?깅줉泥섎━?쒕떎.
	 * 
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @param String       - ?뱀쭅?먯젙蹂?
	 */
	@Override
	public void insertBndtManageBnde(BndtManageVO bndtManageVO, String checkedBndtManageForInsert) throws Exception {
		BndtManage bndtManage;

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(checkedBndtManageForInsert)) {
			String[] bndtManageValues = checkedBndtManageForInsert.split("[$]");
			for (String sTemp : bndtManageValues) {
				bndtManage = new BndtManage();
				String[] sTempBndtManage = sTemp.split(",");
				bndtManage.setBndtDe(sTempBndtManage[0]);
				bndtManage.setBndtId(sTempBndtManage[1]);
				bndtManage.setRemark("?뱀쭅?쇨큵?깅줉");
				bndtManage.setFrstRegisterId(bndtManageVO.getFrstRegisterId());

				bndtManageDAO.insertBndtManage(bndtManage);
			}
		}
	}

	/**
	 * ?뱀쭅愿由?嫄댁닔瑜?議고쉶?쒕떎.
	 * 
	 * @param bndtManage - ?뱀쭅愿由?
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectBndtManageMonthCnt(BndtManageVO bndtManageVO) throws Exception {
		return bndtManageDAO.selectBndtManageMonthCnt(bndtManageVO);
	}

	/**
	 * ?대떦?쇱옄? ?꾩옱?쇱옄???쇱닔 怨꾩궛 (?붿씪??援ы븿)
	 * 
	 * @param annvrsryManageVO
	 * @return long (1~7濡??붿씪??由ы꽩)
	 */
	@SuppressWarnings("static-access")
	private int getDateWeekInt(String sDate) throws Exception {
		Calendar targetDate = Calendar.getInstance();
		String sDayOfWeek = null;
		int iWeek = 0;
		sDayOfWeek = EgovStringUtil.removeMinusChar(sDate);
		// KISA 蹂댁븞?쎌젏 議곗튂 - ??null) 媛?泥댄겕
		if (sDayOfWeek == null) {
			return 0;
		}
		targetDate.set(Integer.parseInt(sDayOfWeek.substring(0, 4)), Integer.parseInt(sDayOfWeek.substring(4, 6)) - 1,
				Integer.parseInt(sDayOfWeek.substring(6, 8)));
		iWeek = targetDate.get(targetDate.DAY_OF_WEEK);
		return iWeek;
	}

	/**
	 * ?대떦?쇱옄? ?꾩옱?쇱옄???쇱닔 怨꾩궛
	 * 
	 * @param annvrsryManageVO
	 * @return long
	 */
	private String getDateWeekString(String sDate) throws Exception {

		String sDayOfWeek = null;
		String sDayOfWeekReturnValue = null;
		sDayOfWeek = EgovStringUtil.removeMinusChar(sDate);
		String[] dayOfWeek = { "??, "??, "??, "??, "紐?, "湲?, "?? };
		Calendar targetDate = new GregorianCalendar();

		if (sDayOfWeek != null && sDayOfWeek.length() >= 8) {
			targetDate.set(Integer.parseInt(sDayOfWeek.substring(0, 4)),
					Integer.parseInt(sDayOfWeek.substring(4, 6)) - 1, Integer.parseInt(sDayOfWeek.substring(6, 8)));
			sDayOfWeekReturnValue = EgovDateUtil.formatDate(sDayOfWeek, "-") + " "
					+ dayOfWeek[targetDate.get(Calendar.DAY_OF_WEEK) - 1];
		}

		return sDayOfWeekReturnValue;

	}
}
