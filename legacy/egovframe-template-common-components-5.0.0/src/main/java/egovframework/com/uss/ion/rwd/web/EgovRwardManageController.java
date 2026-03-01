package egovframework.com.uss.ion.rwd.web;

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
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.rwd.service.EgovRwardManageService;
import egovframework.com.uss.ion.rwd.service.RwardManage;
import egovframework.com.uss.ion.rwd.service.RwardManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?ъ긽愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ъ긽愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?ъ긽愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2011.08.16  ?뺤쭊??         VcatnManageVO Dependency ?쒓굅, ?ъ슜?섏? ?딅뒗 媛앹껜 ?좎뼵
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.08.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovRwardManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovRwardManageService")
	private EgovRwardManageService egovRwardManageService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * ?ъ긽愿由?紐⑸줉?붾㈃ ?대룞
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/uss/ion/rwd/EgovRwardManageListView.do")
	public String selectRwardManageListView(/* @ModelAttribute("vcatnManageVO") VcatnManageVO vcatnManageVO, */ // 2011.8.16
																												// ?섏젙遺?
			ModelMap model) throws Exception {
		List<?> rwardCdCodeList = null;
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM055");
		rwardCdCodeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("rwardCodeList", rwardCdCodeList);

		return "egovframework/com/uss/ion/rwd/EgovRwardManageList";
	}

	/**
	 * ?ъ긽愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???ъ긽愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?ъ긽愿由?, order = 920, gid = 50)
	@RequestMapping(value = "/uss/ion/rwd/selectRwardManageList.do")
	public String selectRwardManageList(@ModelAttribute("rwardManageVO") RwardManageVO rwardManageVO, ModelMap model)
			throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(rwardManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(rwardManageVO.getPageUnit());
		paginationInfo.setPageSize(rwardManageVO.getPageSize());

		rwardManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		rwardManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		rwardManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		rwardManageVO.setRwardManageList(egovRwardManageService.selectRwardManageList(rwardManageVO));

		model.addAttribute("rwardManageList", rwardManageVO.getRwardManageList());

		int totCnt = egovRwardManageService.selectRwardManageListTotCnt(rwardManageVO);
		paginationInfo.setTotalRecordCount(totCnt);

		List<?> rwardCdCodeList = null;
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM055");
		rwardCdCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("rwardCodeList", rwardCdCodeList);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/rwd/EgovRwardManageList";
	}

	/**
	 * ?깅줉???ъ긽愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/rwd/EgovRwardManageDetail.do")
	public String selectRwardManage(@ModelAttribute("rwardManage") RwardManage rwardManage,
			@ModelAttribute("rwardManageVO") RwardManageVO rwardManageVO, @RequestParam Map<?, ?> commandMap,
			ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
		rwardManageVO.setRwardDe(EgovStringUtil.removeMinusChar(rwardManageVO.getRwardDe()));

		// ?깅줉 ?곸꽭?뺣낫
		RwardManageVO rwardManageVOTemp = egovRwardManageService.selectRwardManage(rwardManageVO);

		model.addAttribute("rwardManageVO", rwardManageVOTemp);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if (sCmd.equals("updt")) {
			RwardManage rwardManage1 = new RwardManage();

			rwardManage1.setRwardId(rwardManageVOTemp.getRwardId());
			rwardManage1.setRwardNm(rwardManageVOTemp.getRwardNm());
			rwardManage1.setPblenCn(rwardManageVOTemp.getPblenCn());
			rwardManage1.setRwardManId(rwardManageVOTemp.getRwardManId());
			rwardManage1.setRwardCd(rwardManageVOTemp.getRwardCd());
			rwardManage1.setRwardDe(rwardManageVOTemp.getRwardDe());
			rwardManage1.setInfrmlSanctnId(rwardManageVOTemp.getInfrmlSanctnId());
			rwardManage1.setSanctnerId(rwardManageVOTemp.getSanctnerId());

			List<?> rwardCdCodeList = null;
			ComDefaultCodeVO vo = new ComDefaultCodeVO();
			vo.setCodeId("COM055");
			rwardCdCodeList = cmmUseService.selectCmmCodeDetail(vo);
			model.addAttribute("rwardCodeList", rwardCdCodeList);
			model.addAttribute("rwardManage", rwardManage1);
			return "egovframework/com/uss/ion/rwd/EgovRwardUpdt";
		} else {
			return "egovframework/com/uss/ion/rwd/EgovRwardDetail";
		}

	}

	/**
	 * ?ъ긽愿由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/rwd/EgovRwardRegist.do")
	public String insertViewRwardManage(@ModelAttribute("rwardManage") RwardManage rwardManage,
			@ModelAttribute("rwardManageVO") RwardManageVO rwardManageVO, ModelMap model) throws Exception {
		List<?> rwardCdCodeList = null;
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM055");
		rwardCdCodeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("rwardCodeList", rwardCdCodeList);
		return "egovframework/com/uss/ion/rwd/EgovRwardRegist";
	}

	/**
	 * ?ъ긽愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param rwardManage - ?ъ긽愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/rwd/insertRwardManage.do")
	public String insertRwardManage(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("rwardManage") RwardManage rwardManage,
			@ModelAttribute("rwardManageVO") RwardManageVO rwardManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("rwardManageVO", rwardManageVO);
			return "egovframework/com/uss/ion/rwd/EgovRwardRegist";
		} else {
			// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
			List<FileVO> fvoList = null;
			String atchFileId = "";

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");

			if (!files.isEmpty()) {
				fvoList = fileUtil.parseFileInf(files, "RWD_", 0, "", "");
				atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
			}
			// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
			rwardManage.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			rwardManage.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId()); // 理쒖큹?깅줉?륤D
			egovRwardManageService.insertRwardManage(rwardManage);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			return "forward:/uss/ion/rwd/selectRwardManageList.do";

		}
	}

	/**
	 * 湲??깅줉???ъ긽愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param rwardManage - ?ъ긽愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/rwd/updtRwardManage.do")
	public String updtRwardManage(@RequestParam("atchFileAt") String atchFileAt,
			final MultipartHttpServletRequest multiRequest, @ModelAttribute("rwardManage") RwardManage rwardManage,
			@ModelAttribute("rwardManageVO") RwardManageVO rwardManageVO, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("rwardManageVO", rwardManageVO);
			model.addAttribute("rwardManage", rwardManage);
			return "egovframework/com/uss/ion/rwd/EgovRwardUpdt";
		} else {
			// 泥⑤??뚯씪 愿??ID ?앹꽦 start....
			String atchFileId = rwardManage.getAtchFileId();

			//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
			final List<MultipartFile> files = multiRequest.getFiles("file_1");
			// System.out.println("updtRwardManage 1");
			if (!files.isEmpty()) {
				// System.out.println("updtRwardManage 2");
				if ("N".equals(atchFileAt)) {

					// System.out.println("updtRwardManage 3");
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "RWD_", 0, atchFileId, "");
					atchFileId = fileMngService.insertFileInfs(fvoList);

					// 泥⑤??뚯씪 ID ?뗮똿
					rwardManage.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

				} else {
					// System.out.println("updtRwardManage 4");
					FileVO fvo = new FileVO();
					fvo.setAtchFileId(atchFileId);
					int fileKeyParam = fileMngService.getMaxFileSN(fvo);
					List<FileVO> fvoList = fileUtil.parseFileInf(files, "RWD_", fileKeyParam, atchFileId, "");
					fileMngService.updateFileInfs(fvoList);
				}
			}
			// 泥⑤??뚯씪 愿??ID ?앹꽦 end...
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			rwardManage.setRwardDe(EgovStringUtil.removeMinusChar(rwardManage.getRwardDe()));
			egovRwardManageService.updtRwardManage(rwardManage);
			return "forward:/uss/ion/rwd/selectRwardManageList.do";
		}
	}

	/**
	 * 湲??깅줉???ъ긽愿由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param rwardManage - ?ъ긽愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/rwd/deleteRwardManage.do")
	public String deleteRwardManage(@ModelAttribute("rwardManage") RwardManage rwardManage, SessionStatus status,
			ModelMap model) throws Exception {
		rwardManage.setRwardDe(EgovStringUtil.removeMinusChar(rwardManage.getRwardDe()));

		// 泥⑤??뚯씪 ??젣瑜??꾪븳 ID ?앹꽦 start....
		String atchFileId = rwardManage.getAtchFileId();

		// ?ъ긽 ??젣 泥섎━
		egovRwardManageService.deleteRwardManage(rwardManage);

		// 泥⑤??뚯씪????젣?섍린 ?꾪븳 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 泥⑤??뚯씪 ??젣 End.............

		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/rwd/selectRwardManageList.do";
	}

	/*** ?뱀씤愿??***/
	/**
	 * ?ъ긽愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???ъ긽愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?ъ긽?뱀씤愿由?, order = 921, gid = 50)
	@RequestMapping(value = "/uss/ion/rwd/EgovRwardConfmList.do")
	public String selectRwardManageConfmList(@ModelAttribute("rwardManageVO") RwardManageVO rwardManageVO,
			ModelMap model) throws Exception {
		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(rwardManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(rwardManageVO.getPageUnit());
		paginationInfo.setPageSize(rwardManageVO.getPageSize());

		rwardManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		rwardManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		rwardManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		if (user == null) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		rwardManageVO.setSanctnerId(user.getUniqId()); // ?ъ슜?먭? ?뱀씤沅뚯옄?몄? 議곌굔媛?setting selectRwardManageList

		rwardManageVO.setRwardManageList(egovRwardManageService.selectRwardManageConfmList(rwardManageVO));

		model.addAttribute("rwardManageList", rwardManageVO.getRwardManageList());

		int totCnt = egovRwardManageService.selectRwardManageConfmListTotCnt(rwardManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		List<?> rwardCdCodeList = null;
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM055");
		rwardCdCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("rwardCodeList", rwardCdCodeList);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/rwd/EgovRwardConfmList";
	}

	/**
	 * ?ъ긽?뱀씤愿由??곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/rwd/EgovRwardConfm.do")
	public String selectRwardConfm(@ModelAttribute("rwardManageVO") RwardManageVO rwardManageVO,
			@ModelAttribute("rwardManage") RwardManage rwardManage, ModelMap model) throws Exception {
		rwardManageVO.setRwardDe(EgovStringUtil.removeMinusChar(rwardManageVO.getRwardDe()));

		// ?깅줉 ?곸꽭?뺣낫
		RwardManageVO rwardManageVOTemp = egovRwardManageService.selectRwardManage(rwardManageVO);

		RwardManage rwardManageTemp = new RwardManage();

		rwardManageTemp.setRwardId(rwardManageVOTemp.getRwardId());
		rwardManageTemp.setRwardNm(rwardManageVOTemp.getRwardNm());
		rwardManageTemp.setPblenCn(rwardManageVOTemp.getPblenCn());
		rwardManageTemp.setRwardManId(rwardManageVOTemp.getRwardManId());
		rwardManageTemp.setRwardCd(rwardManageVOTemp.getRwardCd());
		rwardManageTemp.setRwardDe(rwardManageVOTemp.getRwardDe());
		rwardManageTemp.setSanctnerId(rwardManageVOTemp.getSanctnerId());
		rwardManageTemp.setInfrmlSanctnId(rwardManageVOTemp.getInfrmlSanctnId());

		model.addAttribute("rwardManage", rwardManageTemp);
		model.addAttribute("rwardManageVO", rwardManageVOTemp);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/rwd/EgovRwardConfm";
	}

	/**
	 * ?좎껌???ъ긽???뱀씤泥섎━?쒕떎.
	 * 
	 * @param rwardManage - ?ъ긽愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/rwd/updtRwardConfm.do")
	public String updtRwardManageConfm(@ModelAttribute("rwardManage") RwardManage rwardManage,
			BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			model.addAttribute("rwardManageVO", rwardManage);
			return "egovframework/com/uss/ion/vct/EgovRwardConfm";
		} else {

			rwardManage.setSanctnerId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			rwardManage.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
			rwardManage.setRwardDe(EgovStringUtil.removeMinusChar(rwardManage.getRwardDe()));

			egovRwardManageService.updtRwardManageConfm(rwardManage);
			return "forward:/uss/ion/rwd/EgovRwardConfmList.do";
		}
	}
}
