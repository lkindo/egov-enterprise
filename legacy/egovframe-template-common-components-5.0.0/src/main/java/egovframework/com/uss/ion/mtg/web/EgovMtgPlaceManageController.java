package egovframework.com.uss.ion.mtg.web;

import java.util.Calendar;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.mtg.service.EgovMtgPlaceManageService;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManage;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManageVO;
import egovframework.com.uss.ion.mtg.service.MtgPlaceResve;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?뚯쓽?ㅺ?由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯쓽?ㅺ?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?뚯쓽?ㅺ?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.08.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovMtgPlaceManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovMtgPlaceManageService")
	private EgovMtgPlaceManageService egovMtgPlaceManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * ?뚯쓽?ㅺ?由?紐⑸줉?붾㈃ ?대룞
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/uss/ion/mtg/selectMtgPlaceManageListView.do")
	public String selectMtgPlaceManageListView() throws Exception {

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceManageList";
	}

	/**
	 * ?뚯쓽?ㅺ?由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???뚯쓽?ㅺ?由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?뚯쓽?ㅺ?由?, order = 870, gid = 50)
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceManageList.do")
	public String selectMtgPlaceManageList(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage, BindingResult bindingResult,
			ModelMap model) throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(mtgPlaceManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(mtgPlaceManageVO.getPageUnit());
		paginationInfo.setPageSize(mtgPlaceManageVO.getPageSize());

		mtgPlaceManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		mtgPlaceManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		mtgPlaceManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		mtgPlaceManageVO.setMtgPlaceManageList(egovMtgPlaceManageService.selectMtgPlaceManageList(mtgPlaceManageVO));

		int totCnt = egovMtgPlaceManageService.selectMtgPlaceManageListTotCnt(mtgPlaceManageVO);
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("mtgPlaceManageList", mtgPlaceManageVO.getMtgPlaceManageList());
		model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceManageList";
	}

	/**
	 * ?깅줉???뚯쓽?ㅺ?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceManage.do")
	public String selectMtgPlaceManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM070");
		List<CmmnDetailCode> lcSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("lcSeCode", lcSeCodeList);
		model.addAttribute("mtgPlaceManage", egovMtgPlaceManageService.selectMtgPlaceManage(mtgPlaceManageVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("update")) {
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceUpdt";
		} else {
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceDetail";
		}
	}

	/**
	 * ?뚯쓽?ㅺ?由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/insertViewMtgPlace.do")
	public String insertViewMtgPlaceManage(@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO, ModelMap model) throws Exception {

		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM070");
		List<CmmnDetailCode> lcSeCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("lcSeCode", lcSeCodeList);

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceRegist";
	}

	/**
	 * ?뚯쓽?ㅺ?由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 * @return String - 由ы꽩 Url
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/mtg/insertMtgPlace.do")
	public String insertMtgPlaceManage(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceRegist";
		} else {
			// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
			List<FileVO> fvoList = null;
			String atchFileId = "";

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");
			if (!files.isEmpty()) {
				fvoList = fileUtil.parseFileInf(files, "MTG_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
			}
			// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
			mtgPlaceManage.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			status.setComplete();
			egovMtgPlaceManageService.insertMtgPlaceManage(mtgPlaceManage, mtgPlaceManageVO);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "redirect:/uss/ion/mtg/selectMtgPlaceManageList.do";
		}
	}

	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 * @return String - 由ы꽩 Url
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/mtg/updtMtgPlace.do")
	public String updateMtgPlaceManage(final MultipartHttpServletRequest multiRequest,
			@RequestParam("atchFileAt") String atchFileAt,
			@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceManage);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceUpdt";
		} else {

			// 泥⑤??뚯씪 愿??ID ?앹꽦 start....
			String atchFileId = mtgPlaceManage.getAtchFileId();

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {

				if ("N".equals(atchFileAt)) {
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "MTG_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 泥⑤??뚯씪 ID ?뗮똿
					mtgPlaceManage.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

				} else {
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "MTG_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}
			// 泥⑤??뚯씪 愿??ID ?앹꽦 end...

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			status.setComplete();
			egovMtgPlaceManageService.updtMtgPlaceManage(mtgPlaceManage, mtgPlaceManageVO);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "redirect:/uss/ion/mtg/selectMtgPlaceManageList.do";
		}
	}

	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/deleteMtgPlaceManage.do")
	public String deleteMtgPlaceManage(@ModelAttribute("mtgPlaceManage") MtgPlaceManage mtgPlaceManage,
			SessionStatus status, ModelMap model) throws Exception {
		// 泥⑤??뚯씪 ??젣瑜??꾪븳 ID ?앹꽦 start....
		String atchFileId = mtgPlaceManage.getAtchFileId();

		egovMtgPlaceManageService.deleteMtgPlaceManage(mtgPlaceManage);

		// 泥⑤??뚯씪????젣?섍린 ?꾪븳 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 泥⑤??뚯씪 ??젣 End.............

		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/mtg/selectMtgPlaceManageList.do";
	}

	/**
	 * ?깅줉???뚯쓽?ㅺ?由ъ쓽 ?대?吏 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceImage.do")
	public String selectMtgPlaceImage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@RequestParam("sTmMtgPlaceId") String sTmMtgPlaceId, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {
		mtgPlaceManageVO.setMtgPlaceId(sTmMtgPlaceId);

		MtgPlaceManage resultVO = egovMtgPlaceManageService.selectMtgPlaceManage(mtgPlaceManageVO);

		FileVO fileVO = new FileVO();
		fileVO.setAtchFileId(resultVO.getAtchFileId());
		List<FileVO> result = fileMngService.selectImageFileList(fileVO);

		model.addAttribute("fileList", result);
		model.addAttribute("mtgPlaceManage", egovMtgPlaceManageService.selectMtgPlaceManage(mtgPlaceManageVO));

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceImageDetail";
	}

	/**** ?뚯쓽???덉빟 ****/

	/**
	 * ?뚯쓽?ㅼ삁???뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???뚯쓽?ㅼ삁??紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?뚯쓽?ㅼ삁?쎄?由?, order = 871, gid = 50)
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceResveManageList.do")
	public String selectMtgPlaceResveManageList(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			ModelMap model) throws Exception {
		/*
		 * ***************************************************************** // 罹섎윴???ㅼ젙
		 * 濡쒖쭅
		 */
		Calendar calNow = Calendar.getInstance();
		/*
		 * String strYear = (String)commandMap.get("year"); String strMonth =
		 * (String)commandMap.get("month"); String strDay =(
		 * String)commandMap.get("day");
		 */
		String strSearchDay = "";

		int iNowYear = calNow.get(Calendar.YEAR);
		int iNowMonth = calNow.get(Calendar.MONTH);
		int iNowDay = calNow.get(Calendar.DATE);

		if (mtgPlaceManageVO.getResveDe() == null) {
			strSearchDay = Integer.toString(iNowYear);
			strSearchDay += dateTypeIntForString(iNowMonth + 1);
			strSearchDay += dateTypeIntForString(iNowDay);
			mtgPlaceManageVO.setResveDe(strSearchDay);
			mtgPlaceManageVO.setResveDeView(EgovDateUtil.formatDate(strSearchDay, "-"));
		} else {
			mtgPlaceManageVO.setResveDeView(EgovDateUtil.formatDate(mtgPlaceManageVO.getResveDe(), "-"));
		}

		mtgPlaceManageVO.setResveDe(EgovDateUtil.formatDate(mtgPlaceManageVO.getResveDe(), "-")); // formatDate
		// mtgPlaceManageVO.setResveDe(mtgPlaceManageVO.getResveDe());
		mtgPlaceManageVO
				.setMtgPlaceManageList(egovMtgPlaceManageService.selectMtgPlaceResveManageList(mtgPlaceManageVO));
		model.addAttribute("mtgPlaceManageList", mtgPlaceManageVO.getMtgPlaceManageList());
		model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
		// model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveManageList";
	}

	/**
	 * ?뚯쓽?ㅼ삁???좎껌 ?붾㈃??議고쉶?쒕떎.
	 * 
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceResveManage.do")
	public String selectMtgPlaceResveManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
		String sTempResveDe = mtgPlaceManageVO.getResveDe();
		String sTempResveBeginTm = mtgPlaceManageVO.getResveBeginTm();
		String sTempResveEndTm = mtgPlaceManageVO.getResveEndTm();

		MtgPlaceManageVO resultVO = egovMtgPlaceManageService.selectMtgPlaceResve(mtgPlaceManageVO);
		resultVO.setResveDe(sTempResveDe);
		resultVO.setResveBeginTm(sTempResveBeginTm);
		resultVO.setResveEndTm(sTempResveEndTm);
		resultVO.setResveDe(EgovDateUtil.formatDate(resultVO.getResveDe(), "-"));

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		resultVO.setMtgPlaceTemp4(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));
		resultVO.setMtgPlaceTemp5(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getOrgnztNm()));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		model.addAttribute("mtgPlaceManageVO", resultVO);
		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveRegist";
	}

	/**
	 * ?깅줉???뚯쓽?ㅼ삁???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/selectMtgPlaceResveManageDetail.do")
	public String selectMtgPlaceResveManageDetail(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇

		MtgPlaceManageVO resultVO = egovMtgPlaceManageService.selectMtgPlaceResveDetail(mtgPlaceManageVO);
		resultVO.setResveDe(EgovDateUtil.formatDate(resultVO.getResveDe(), "-"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("detail")) {
			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			resultVO.setUsidTemp(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			String resveBeginTm = resultVO.getResveBeginTm();
			String resveEndTm = resultVO.getResveEndTm();
			if (resveBeginTm.length() == 3) {
				resveBeginTm = "0" + resveBeginTm.substring(0, 1) + ":" + resveBeginTm.substring(1, 3);
			} else if (resveBeginTm.length() == 4) {
				resveBeginTm = resveBeginTm.substring(0, 2) + ":" + resveBeginTm.substring(2, 4);
			}
			if (resveEndTm.length() == 3) {
				resveEndTm = "0" + resveEndTm.substring(0, 1) + ":" + resveEndTm.substring(1, 3);
			} else if (resveEndTm.length() == 4) {
				resveEndTm = resveEndTm.substring(0, 2) + ":" + resveEndTm.substring(2, 4);
			}

			resultVO.setResveBeginTm(resveBeginTm);
			resultVO.setResveEndTm(resveEndTm);
			model.addAttribute("mtgPlaceManageVO", resultVO);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveDetail";
		} else {
			model.addAttribute("mtgPlaceManageVO", resultVO);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveUpdt";
		}
	}

	/**
	 * ?뚯쓽?ㅼ삁???뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param mtgPlaceResve - ?뚯쓽?ㅼ삁??model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/insertMtgPlaceResve.do")
	public String insertMtgPlaceResveManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceManageVO);
			return "forward:/uss/ion/mtg/selectMtgPlaceResveManage.do";
		} else {

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			mtgPlaceResve.setResveManId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			mtgPlaceResve.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			egovMtgPlaceManageService.insertMtgPlaceResve(mtgPlaceResve);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "forward:/uss/ion/mtg/selectMtgPlaceResveManageList.do";
		}
	}

	/**
	 * 湲??깅줉???뚯쓽?ㅼ삁???뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param mtgPlaceResve - ?뚯쓽?ㅼ삁??model
	 * @return String - 由ы꽩 Url
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/mtg/updtMtgPlaceResve.do")
	public String updtMtgPlaceResveManage(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("mtgPlaceManageVO", mtgPlaceResve);
			return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

			status.setComplete();
			egovMtgPlaceManageService.updtMtgPlaceResve(mtgPlaceResve);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "forward:/uss/ion/mtg/selectMtgPlaceResveManageList.do";
		}
	}

	/**
	 * 湲??깅줉???뚯쓽?ㅼ삁???뺣낫瑜???젣?쒕떎.
	 * 
	 * @param mtgPlaceResve - ?뚯쓽?ㅼ삁??model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/mtg/deleteMtgPlaceResve.do")
	public String deleteMtgPlaceResveManage(@ModelAttribute("mtgPlaceResve") MtgPlaceResve mtgPlaceResve,
			SessionStatus status, ModelMap model) throws Exception {

		egovMtgPlaceManageService.deleteMtgPlaceResve(mtgPlaceResve);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/mtg/selectMtgPlaceResveManageList.do";
	}

	/**
	 * ?뚯쓽??以묐났?щ? 泥댄겕.
	 * 
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return int - 以묐났嫄댁닔
	 */
	@RequestMapping(value = "/uss/ion/mtg/mtgPlaceResveDplactCeck.do")
	public String mtgPlaceResveDplactCeck(@ModelAttribute("mtgPlaceManageVO") MtgPlaceManageVO mtgPlaceManageVO,
			@RequestParam("sTmResveDe") String sTempResveDe, @RequestParam("sTmResveBeginTm") String sTempResveBeginTm,
			@RequestParam("sTmResveEndTm") String sTempResveEndTm,
			@RequestParam("sTmMtgPlaceId") String sTempMtgPlaceId, @RequestParam("sTmResveId") String sTempResveId,
			ModelMap model) throws Exception {
		mtgPlaceManageVO.setResveDe(sTempResveDe);
		mtgPlaceManageVO.setMtgPlaceId(sTempMtgPlaceId);
		mtgPlaceManageVO.setResveBeginTm(sTempResveBeginTm);
		mtgPlaceManageVO.setResveEndTm(sTempResveEndTm);
		mtgPlaceManageVO.setResveId(sTempResveId);
		int dplactCeckCnt = egovMtgPlaceManageService.mtgPlaceResveDplactCeck(mtgPlaceManageVO);
		model.addAttribute("dplactCeck", dplactCeckCnt);
		return "egovframework/com/uss/ion/mtg/EgovMtgPlaceResveDplactCeck";
	}

	/**
	 * 0??遺숈뿬 諛섑솚
	 * 
	 * @return String
	 * @throws
	 */
	private String dateTypeIntForString(int iInput) {
		String sOutput = "";
		if (Integer.toString(iInput).length() == 1) {
			sOutput = "0" + Integer.toString(iInput);
		} else {
			sOutput = Integer.toString(iInput);
		}
		return sOutput;
	}
}
