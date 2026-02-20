package egovframework.com.uss.ion.ntm.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.ntm.service.EgovNoteManageService;
import egovframework.com.uss.ion.ntm.service.NoteManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 履쎌? 愿由?蹂대궡湲?瑜?泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.16  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.08.04  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovNoteManageController {

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** egovOnlinePollService */
	@Resource(name = "egovNoteManageService")
	private EgovNoteManageService egovNoteManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** 怨듯넻肄붾뱶 ?쒕퉬??*/
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** ?뚯씪泥⑤? 愿由??쒕퉬??*/
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	/** ?뚯씪泥⑤? Util */
	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/**
	 * 履쎌? 愿由?蹂대궡湲? 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param noteManage -履쎌?愿由?Model
	 * @param commandMap -Request Variable
	 * @param model      -Spring ?쒓났?섎뒗 ModelMap
	 * @return String -由ы꽩 URL
	 * @throws Exception
	 */
	@IncludedInfo(name = "履쎌?愿由?, order = 840, gid = 50)
	@RequestMapping(value = "/uss/ion/ntm/registEgovNoteManage.do")
	public String EgovNoteRecptnRegistForm(NoteManageVO noteManage, @RequestParam Map<?, ?> commandMap, ModelMap model)
			throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ?섏떊援щ텇
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM050");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("recptnSe", listComCode);

		// ?듬?泥섎━
		if (sCmd.equals("reply")) {
			model.addAttribute("cmd", sCmd);

			Map<?, ?> mapNoteManage = egovNoteManageService.selectNoteManage(noteManage);

			noteManage.setNoteSj("RE : " + (String) mapNoteManage.get("noteSj"));

			model.addAttribute("noteManage", noteManage);
			model.addAttribute("noteManageMap", mapNoteManage);
		} else {
			model.addAttribute("noteManage", new NoteManageVO());
		}

		return "egovframework/com/uss/ion/ntm/EgovNoteManage";

	}

	/**
	 * 履쎌? 愿由?蹂대궡湲? 紐⑸줉??議고쉶?쒕떎.(POST?뺤떇)
	 * 
	 * @param multiRequest  -Multipart Request
	 * @param commandMap    -Request Variable
	 * @param noteManage    -履쎌?愿由?Model
	 * @param bindingResult -Validator ?섍린?꾪븳 媛앹껜
	 * @param model         -Spring ?쒓났?섎뒗 ModelMap
	 * @return String -由ы꽩 URL
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ntm/registEgovNoteManageActor.do")
	public String EgovNoteRecptnRegist(final MultipartHttpServletRequest multiRequest,
			@RequestParam Map<?, ?> commandMap, NoteManageVO noteManage, BindingResult bindingResult, ModelMap model)
			throws Exception {

		String sLocationUrl = "egovframework/com/uss/ion/ntm/EgovNoteManage";

		// 蹂???ㅼ젙
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("reply")) {
			sLocationUrl = "redirect:/uss/ion/ntr/listNoteRecptn.do";
		}

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			model.addAttribute("noteManage", noteManage);
			return sLocationUrl;
		}
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ?꾩씠???ㅼ젙
		noteManage.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		noteManage.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
		List<FileVO> fvoList = null;
		String atchFileId = "";

		final Map<String, MultipartFile> files = multiRequest.getFileMap();

		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
		}
		noteManage.setAtchFileId(atchFileId);

		// 履쎌??깅줉
		egovNoteManageService.insertNoteManage(noteManage, commandMap);
		// NoteManage 鍮?媛앹껜 ?앹꽦
		model.addAttribute("noteManage", new NoteManageVO());

		// ?깅줉硫붿꽭吏 ?ㅼ젙
		String reusltScript = "";

		reusltScript += "<script type='text/javaScript' language='javascript'>";
		reusltScript += "alert(' ?묒꽦??履쎌?瑜??꾩넚?섏??듬땲??  ');";
		reusltScript += "</script>";

		model.addAttribute("reusltScript", reusltScript);

		return sLocationUrl;
	}

	/**
	 * 履쎌? 愿由?蹂대궡湲? ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO   -寃?됱젙蹂닿? ?닿릿 Model
	 * @param commandMap -Request Variable
	 * @param model      -Spring ?쒓났?섎뒗 ModelMap
	 * @return String -由ы꽩 URL
	 * @throws Exception
	 */

	@RequestMapping(value = "/uss/ion/ntm/listEgovNoteEmpListPopup.do")
	public String EgovEgovNoteEmpList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		List<EgovMap> resultList = egovNoteManageService.selectNoteEmpListPopup(searchVO);
		model.addAttribute("resultList", resultList);

		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> reusltList = egovNoteManageService.selectNoteEmpListPopup(searchVO);
		model.addAttribute("resultList", reusltList);

		model.addAttribute("searchKeyword",
				commandMap.get("searchKeyword") == null ? "" : (String) commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
				commandMap.get("searchCondition") == null ? "" : (String) commandMap.get("searchCondition"));

		int totCnt = egovNoteManageService.selectNoteEmpListPopupCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ntm/EgovNoteEmpList";
	}

}
