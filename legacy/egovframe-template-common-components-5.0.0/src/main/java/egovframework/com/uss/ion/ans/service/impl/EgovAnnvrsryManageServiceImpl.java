package egovframework.com.uss.ion.ans.service.impl;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.apache.poi.hssf.usermodel.HSSFCell;
import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.ans.service.AnnvrsryManage;
import egovframework.com.uss.ion.ans.service.AnnvrsryManageVO;
import egovframework.com.uss.ion.ans.service.EgovAnnvrsryManageService;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - 湲곕뀗?쇨?由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 湲곕뀗?쇨?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 湲곕뀗?쇨?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2010.06.15  ?댁슜           理쒖큹 ?앹꽦
 *   2018.11.30  理쒕몢??         selectAnnvrsryManageBnde?먯꽌 annvrsryManageVO??null泥섎━ 異붽?
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.08.02  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("egovAnnvrsryManageService")
public class EgovAnnvrsryManageServiceImpl extends EgovAbstractServiceImpl implements EgovAnnvrsryManageService {

	@Resource(name = "annvrsryManageDAO")
	private AnnvrsryManageDAO annvrsryManageDAO;

	@Resource(name = "excelZipService")
	private EgovExcelService excelZipService;

	/** ID Generation */
	@Resource(name = "egovAnnvrsryManageIdGnrService")
	private EgovIdGnrService idgenAnnvrsryManageService;

	/**
	 * 湲곕뀗?쇨?由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉??湲곕뀗?쇨?由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return List - 湲곕뀗?쇨?由?紐⑸줉
	 */
	@Override
	public List<AnnvrsryManageVO> selectAnnvrsryManageList(AnnvrsryManageVO annvrsryManageVO) throws Exception {

		List<AnnvrsryManageVO> result = annvrsryManageDAO.selectAnnvrsryManageList(annvrsryManageVO);
		int num = result.size();

		for (int i = 0; i < num; i++) {
			AnnvrsryManageVO annvrsryManageVO1 = result.get(i);
			annvrsryManageVO1.setAnnvrsryDe(EgovDateUtil.formatDate(annvrsryManageVO1.getAnnvrsryDe(), "-"));
			result.set(i, annvrsryManageVO1);
		}
		return result;
	}

	/**
	 * 湲곕뀗?쇨?由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return int - 湲곕뀗?쇨?由?移댁슫????
	 */
	@Override
	public int selectAnnvrsryManageListTotCnt(AnnvrsryManageVO annvrsryManageVO) throws Exception {
		return annvrsryManageDAO.selectAnnvrsryManageListTotCnt(annvrsryManageVO);
	}

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return AnnvrsryManageVO - 湲곕뀗?쇨?由?VO
	 */
	@Override
	public AnnvrsryManageVO selectAnnvrsryManage(AnnvrsryManageVO annvrsryManageVO) throws Exception {
		annvrsryManageVO.setAnnvrsryDe(EgovStringUtil.removeMinusChar(annvrsryManageVO.getAnnvrsryDe()));
		AnnvrsryManageVO annvrsryManageVOTemp = annvrsryManageDAO.selectAnnvrsryManage(annvrsryManageVO);
		annvrsryManageVOTemp.setAnnvrsryDe(EgovDateUtil.formatDate(annvrsryManageVOTemp.getAnnvrsryDe(), "-"));
		return annvrsryManageVOTemp;
	}

	/**
	 * 湲곕뀗?쇨?由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	@Override
	public void insertAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		annvrsryManage.setAnnvrsryDe(EgovStringUtil.removeMinusChar(annvrsryManage.getAnnvrsryDe()));

		String sAnnId = idgenAnnvrsryManageService.getNextStringId();
		annvrsryManage.setAnnId(sAnnId);
		annvrsryManageDAO.insertAnnvrsryManage(annvrsryManage);
	}

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	@Override
	public void updateAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		annvrsryManage.setAnnvrsryDe(EgovStringUtil.removeMinusChar(annvrsryManage.getAnnvrsryDe()));
		annvrsryManageDAO.updateAnnvrsryManage(annvrsryManage);
	}

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	@Override
	public void deleteAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		annvrsryManage.setAnnvrsryDe(EgovStringUtil.removeMinusChar(annvrsryManage.getAnnvrsryDe()));
		annvrsryManageDAO.deleteAnnvrsryManage(annvrsryManage);
	}

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return AnnvrsryManageVO - 湲곕뀗?쇨?由?VO
	 */
	@Override
	public List<AnnvrsryManageVO> selectAnnvrsryGdcc(AnnvrsryManageVO annvrsryManageVO) throws Exception {

		List<AnnvrsryManageVO> resultList = annvrsryManageDAO.selectAnnvrsryGdcc(annvrsryManageVO);
		List<AnnvrsryManageVO> result = new ArrayList<>();
		long lTemp = 0;
		int num = resultList.size();

		for (int i = 0; i < num; i++) {
			AnnvrsryManageVO annvrsryManageVO1 = resultList.get(i);
			lTemp = getDateCount(annvrsryManageVO1);

			if (lTemp >= 0
					&& lTemp < Long.parseLong(annvrsryManageVO1.getAnnvrsryBeginDe().replaceAll("\\p{Space}", ""))) {
				annvrsryManageVO1.setAnnvrsryDe(EgovDateUtil.formatDate(annvrsryManageVO1.getAnnvrsryDe(), "-"));
				resultList.set(i, annvrsryManageVO1);
				result.add(resultList.get(i));
			}
		}
		return result;
	}

	/**
	 * 湲곕뀗?쇨?由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return int - 湲곕뀗?쇨?由?移댁슫????
	 */
	@Override
	public int selectAnnvrsryManageDplctAt(AnnvrsryManage annvrsryManage) throws Exception {
		return annvrsryManageDAO.selectAnnvrsryManageDplctAt(annvrsryManage);
	}

	/**
	 * ?대떦?쇱옄? ?꾩옱?쇱옄???쇱닔 怨꾩궛
	 * 
	 * @param annvrsryManageVO
	 * @return long
	 */
	private long getDateCount(AnnvrsryManageVO annvrsryManageVO) throws Exception {

		/* ?좎쭨 ?ъ씠??湲곌컙 ?곗텧 */
		long resultDay = 0;
		Calendar today = Calendar.getInstance(); // Calendar媛앹껜瑜??앹꽦?⑸땲??
		Calendar targetDate = Calendar.getInstance();

		String sAnnvrsryDe = null;

		sAnnvrsryDe = EgovStringUtil.removeMinusChar(annvrsryManageVO.getAnnvrsryDe());

		// 留ㅻ뀈諛섎났??寃쎌슦
		if ("1".equals(annvrsryManageVO.getReptitSe())) {
			sAnnvrsryDe = Integer.toString(today.get(Calendar.YEAR))
					+ (sAnnvrsryDe == null || sAnnvrsryDe.length() < 8 ? today.get(Calendar.MONTH)
							: sAnnvrsryDe.substring(4, 6))
					+ (sAnnvrsryDe == null || sAnnvrsryDe.length() < 8 ? today.get(Calendar.DATE)
							: sAnnvrsryDe.substring(6, 8));
		}

		// ?뚮젰??寃쎌슦 ?묐젰?쇰줈 ?섏궛
		if ("2".equals(annvrsryManageVO.getCldrSe())) {
			sAnnvrsryDe = EgovDateUtil.toSolar(sAnnvrsryDe, 0);
		}

		if (sAnnvrsryDe != null && !sAnnvrsryDe.equals("")) {
			targetDate.set(Integer.parseInt(sAnnvrsryDe.substring(0, 4)),
					Integer.parseInt(sAnnvrsryDe.substring(4, 6)) - 1, Integer.parseInt(sAnnvrsryDe.substring(6, 8)));
		} else {
			targetDate.set(today.get(Calendar.YEAR), today.get(Calendar.MONTH) + 1, today.get(Calendar.DATE));
		}

		long resultTime = targetDate.getTime().getTime() - today.getTime().getTime(); // 李⑥씠 援ы븯湲?
		if (resultTime > 0) {
			resultDay = resultTime / (1000 * 60 * 60 * 24);// ?쇰줈 諛붽씀湲?
		} else {
			resultDay = -1;
		}
		// annvrsryManageVO.setAnnvrsryBeginDe(Long.toString(resultDay));

		return resultDay;
	}

	/* ### ?묒? ?쇨큵泥섎━ ?꾨줈?몄뒪 ### */

	/**
	 * 湲곕뀗?쇱젙蹂?excel?앹꽦
	 * 
	 * @param inputStream InputStream
	 * @return String
	 * @exception Exception
	 */
	@Override
	public List<AnnvrsryManageVO> selectAnnvrsryManageBnde(InputStream inputStream) throws Exception {
		// int annvrsrySheetRowCnt = 0;
		// String xlsFile = null;

		String sTempId = null; // ?ъ슜?륤D
		String sTempNm = null; // ?ъ슜?먮챸
		String sTempAnnvrsryDe = null; // 湲곕뀗?쇱옄
		String sTempCldrSe = null; // ????援щ텇
		String sTempAnnvrsrySe = null; // 湲곕뀗?쇨뎄遺?
		String sTempAnnvrsryNm = null; // 湲곕뀗?쇰챸
		String sTempReptitSe = null; // 諛섎났?щ?

		List<AnnvrsryManageVO> list = new ArrayList<>();

		// String sBndtDe = null;
		HSSFWorkbook hssfWB = (HSSFWorkbook) excelZipService.loadWorkbook(inputStream);
		// ?묒? ?뚯씪 ?쒗듃 媛쒖닔 ?뺤씤 sheet = 1
		if (hssfWB.getNumberOfSheets() == 1) {
			HSSFSheet annvrsrySheet = hssfWB.getSheetAt(0); // 湲곕뀗?쇨?由??쒗듃 媛?몄삤湲?
			// HSSFRow annvrsryRow = annvrsrySheet.getRow(1); //湲곕뀗??row 媛?몄삤湲?
			// annvrsrySheetRowCnt = annvrsryRow.getPhysicalNumberOfCells(); //湲곕뀗??cell Cnt
			int rowsCnt = annvrsrySheet.getPhysicalNumberOfRows(); // ??媛쒖닔 媛?몄삤湲?

			// ?ъ슜?륤D 湲곕뀗?쇱옄 ????援щ텇 湲곕뀗?쇨뎄遺?湲곕뀗?쇰챸
			for (int j = 1; j < rowsCnt; j++) { // row 猷⑦봽
				AnnvrsryManageVO annvrsryManageVO = new AnnvrsryManageVO();
				AnnvrsryManageVO annvrsryManageVOTemp = null;
				HSSFRow row = annvrsrySheet.getRow(j); // row 媛?몄삤湲?
				if (row != null) {
					// int cells = row.getPhysicalNumberOfCells(); //cell 媛쒖닔 媛?몄삤湲?
					HSSFCell cell = null;
					cell = row.getCell(0); // ?ъ슜?륤D
					if (cell != null) {
						sTempId = cell.getStringCellValue();
					}

					cell = row.getCell(1); // ?ъ슜?먮챸
					if (cell != null) {
						sTempNm = cell.getStringCellValue();
					}

					cell = row.getCell(2); // 湲곕뀗?쇱옄
					if (cell != null) {
						sTempAnnvrsryDe = cell.getStringCellValue();
					}

					cell = row.getCell(3); // ???뚭뎄遺?
					if (cell != null) {
						sTempCldrSe = cell.getStringCellValue();
					}

					cell = row.getCell(4); // 湲곕뀗?쇨뎄遺?
					if (cell != null) {
						sTempAnnvrsrySe = cell.getStringCellValue();
					}
					cell = row.getCell(5); // 湲곕뀗?쇰챸
					if (cell != null) {
						sTempAnnvrsryNm = cell.getStringCellValue();
					}
					cell = row.getCell(6); // 諛섎났?щ?
					if (cell != null) {
						sTempReptitSe = cell.getStringCellValue();
					}
					annvrsryManageVO.setUsid(sTempId); // ?뱀쭅?륤D
					annvrsryManageVO.setAnnvrsryTemp1(sTempNm); // ?뱀쭅?먮챸
					annvrsryManageVO.setAnnvrsrySe(sTempAnnvrsrySe);
					annvrsryManageVOTemp = annvrsryManageDAO.selectAnnvrsryManageBnde(annvrsryManageVO);
					if (annvrsryManageVOTemp != null) {
						annvrsryManageVO = annvrsryManageVOTemp; // 湲곗〈???깅줉?섏뼱 ?덈뒗寃쎌슦
					}
					annvrsryManageVO.setAnnvrsrySe(sTempAnnvrsrySe);
					annvrsryManageVO.setAnnvrsryDe(EgovDateUtil.formatDate(sTempAnnvrsryDe, "-"));
					annvrsryManageVO.setCldrSe(sTempCldrSe);
					annvrsryManageVO.setAnnvrsryNm(sTempAnnvrsryNm);
					annvrsryManageVO.setReptitSe(sTempReptitSe);
					list.add(annvrsryManageVO);
				}
			}
		}

		return list;
	}

	/**
	 * 湲곕뀗?쇱젙蹂대? ?쇨큵?깅줉泥섎━?쒕떎.
	 * 
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @param String           - 湲곕뀗?쇱젙蹂?
	 */
	@Override
	public void insertAnnvrsryManageBnde(AnnvrsryManageVO annvrsryManageVO, String checkedAnnvrsryManageForInsert)
			throws Exception {
		AnnvrsryManage annvrsryManage;

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(checkedAnnvrsryManageForInsert)) {
			String[] annvrsryManageValues = checkedAnnvrsryManageForInsert.split("[$]");
			for (String sTemp : annvrsryManageValues) {
				annvrsryManage = new AnnvrsryManage();
				String[] sTempAnnvrsryManage = sTemp.split(",");
				annvrsryManage.setUsid(sTempAnnvrsryManage[0]);

				annvrsryManage.setAnnvrsryDe(EgovStringUtil.removeMinusChar(sTempAnnvrsryManage[1]));
				annvrsryManage.setCldrSe(sTempAnnvrsryManage[2]);
				annvrsryManage.setAnnvrsrySe(sTempAnnvrsryManage[3]);
				annvrsryManage.setAnnvrsryNm(sTempAnnvrsryManage[4]);
				if ("Y".equals(sTempAnnvrsryManage[5])) {
					annvrsryManage.setReptitSe("1");
				}
				annvrsryManage.setAnnvrsryBeginDe("7");
				annvrsryManage.setAnnvrsrySetup("Y");
				annvrsryManage.setMemo("湲곕뀗???쇨큵?깅줉");
				String sAnnId = idgenAnnvrsryManageService.getNextStringId();
				annvrsryManage.setAnnId(sAnnId);

				annvrsryManage.setFrstRegisterId(annvrsryManageVO.getFrstRegisterId());
				annvrsryManageDAO.insertAnnvrsryManage(annvrsryManage);
			}
		}
	}

	/**
	 * 湲곕뀗?쇨?由?嫄댁닔瑜?議고쉶?쒕떎.
	 * 
	 * @param annvrsryManage - 湲곕뀗?쇨?由?
	 * @return int
	 * @exception Exception
	 * 
	 *                      public int selectAnnvrsryManageMonthCnt(AnnvrsryManageVO
	 *                      annvrsryManageVO) throws Exception { return
	 *                      annvrsryManageDAO.selectAnnvrsryManageMonthCnt(annvrsryManageVO);
	 *                      }
	 */

}
