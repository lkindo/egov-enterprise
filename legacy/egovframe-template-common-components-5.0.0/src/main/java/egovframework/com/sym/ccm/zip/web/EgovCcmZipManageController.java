package egovframework.com.sym.ccm.zip.web;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang.StringUtils;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.util.WebUtils;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.sym.ccm.zip.service.EgovCcmRdnmadZipManageService;
import egovframework.com.sym.ccm.zip.service.EgovCcmZipManageService;
import egovframework.com.sym.ccm.zip.service.Zip;
import egovframework.com.sym.ccm.zip.service.ZipVO;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * ?고렪踰덊샇??愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳 Controller瑜?
 * ?뺤쓽?쒕떎
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?띻만??         理쒖큹 ?앹꽦
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.10.07  ?닿린??         蹂댁븞痍⑥빟???섏젙(?뚯씪 ?낅줈?쒖떆 ?묒??뚯씪留?媛?ν븯?꾨줉 異붽?)
 *   2011.11.21  ?닿린??         ?꾨줈紐낆＜??異붽?(rdnmadZip)
 *   2021.02.16  ?좎슜??         WebUtils.getNativeRequest(request,MultipartHttpServletRequest.class);
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2024.10.29  沅뚰깭??         ?깅줉 & ?섏젙???붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━, validation ?곸슜, ?댁쟾?섏씠吏 ?뚮씪誘명꽣 model 異붽?
 *   2025.07.09  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.07.09  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *   2025.07.09  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *
 *      </pre>
 */
@Controller
public class EgovCcmZipManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovCcmZipManageController.class);

	@Resource(name = "ZipManageService")
	private EgovCcmZipManageService zipManageService;

	@Resource(name = "RdnmadZipService")
	private EgovCcmRdnmadZipManageService rdnmadZipService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?고렪踰덊샇 李얘린 ?앹뾽 硫붿씤李쎌쓣 ?몄텧?쒕떎.
	 * 
	 * @param model
	 * @return "egovframework/com/sym/ccm/zip/EgovCcmZipSearchPopup"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipSearchPopup.do")
	public String callNormalCalPopup(ModelMap model) throws Exception {
		return "egovframework/com/sym/ccm/zip/EgovCcmZipSearchPopup";
	}

	/**
	 * ?고렪踰덊샇 李얘린 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/zip/EgovCcmZipSearchList"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipSearchList.do")
	public String selectZipSearchList(@ModelAttribute("searchVO") ZipVO searchVO, ModelMap model) throws Exception {
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

		String sList = "";

		if (searchVO.getSearchList() != null && searchVO.getSearchList() != "") {
			sList = searchVO.getSearchList().substring(0, 1);
		}
		model.addAttribute("searchList", sList);

		if (!sList.equals("2")) {
			List<EgovMap> resultList = zipManageService.selectZipList(searchVO);
			model.addAttribute("resultList", resultList);

			int totCnt = zipManageService.selectZipListTotCnt(searchVO);
			paginationInfo.setTotalRecordCount(totCnt);
			model.addAttribute("paginationInfo", paginationInfo);
		} else {
			List<EgovMap> resultList = rdnmadZipService.selectZipList(searchVO);
			model.addAttribute("resultList", resultList);

			int totCnt = rdnmadZipService.selectZipListTotCnt(searchVO);
			paginationInfo.setTotalRecordCount(totCnt);
			model.addAttribute("paginationInfo", paginationInfo);
		}

		return "egovframework/com/sym/ccm/zip/EgovCcmZipSearchList";
	}

	/**
	 * ?고렪踰덊샇瑜???젣?쒕떎.
	 * 
	 * @param loginVO
	 * @param zip
	 * @param model
	 * @return "forward:/sym/ccm/zip/EgovCcmZipList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipRemove.do")
	public String deleteZip(@ModelAttribute("loginVO") LoginVO loginVO, Zip zip, ZipVO searchVO, ModelMap model)
			throws Exception {
		model.addAttribute("searchList", searchVO.getSearchList());
		if (searchVO.getSearchList().equals("1")) {
			zipManageService.deleteZip(zip);
		} else {
			rdnmadZipService.deleteZip(zip);
		}
		return "forward:/sym/ccm/zip/EgovCcmZipList.do";
	}

	/**
	 * ?고렪踰덊샇 ?깅줉 ?붾㈃
	 * 
	 * @param loginVO
	 * @param zip
	 * @param model
	 * @return "egovframework/com/sym/ccm/zip/EgovCcmZipRegist"
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipRegistView.do")
	public String insertZip(@ModelAttribute("loginVO") LoginVO loginVO, @ModelAttribute("zip") Zip zip, ZipVO searchVO,
			ModelMap model) {
		model.addAttribute("searchList", searchVO.getSearchList());
		model.addAttribute("isRoadAddr", "2".equals(searchVO.getSearchList())); // true : ?꾨줈紐낆＜?뚮벑濡? false : ?쇰컲二쇱냼?깅줉
		return "egovframework/com/sym/ccm/zip/EgovCcmZipRegist";
	}

	/**
	 * ?고렪踰덊샇瑜??깅줉 ?쒕떎.
	 * 
	 * @param loginVO
	 * @param zip
	 * @param bindingResult
	 * @param searchVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipRegist.do")
	public String insertZip(@ModelAttribute("loginVO") LoginVO loginVO, @ModelAttribute("zip") Zip zip,
			BindingResult bindingResult, ZipVO searchVO, ModelMap model) {
		model.addAttribute("searchList", searchVO.getSearchList());

		boolean isRoadAddr = "2".equals(searchVO.getSearchList());

		if (!isRoadAddr && bindingResult.hasErrors()) {
			model.addAttribute("errorMessage", bindingResult.getAllErrors());
			model.addAttribute("zip", zip);
			return "egovframework/com/sym/ccm/zip/EgovCcmZipRegist";
		}
		/*
		 * 2024-08-31 沅뚰깭??- 湲곗〈 肄붾뱶?먯꽌 ?꾨줈紐낆＜??????validate瑜?二쇱꽍 泥섎━?대몢??二쇱꽍???좎???else {
		 * beanValidator.validate(zip, bindingResult); if (bindingResult.hasErrors()){
		 * return "egovframework/com/sym/ccm/zip/EgovCcmZipRegist"; } }
		 */

		zip.setFrstRegisterId(loginVO.getUniqId());
		if (isRoadAddr) {
			rdnmadZipService.insertZip(zip);
		} else {
			zipManageService.insertZip(zip);
		}

		return "redirect:/sym/ccm/zip/EgovCcmZipList.do";
	}

	/**
	 * ?묒??뚯씪???낅줈?쒗븯???고렪踰덊샇瑜??깅줉?쒕떎.
	 * 
	 * @param loginVO
	 * @param request
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/sym/ccm/zip/EgovCcmExcelZipRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmExcelZipRegist.do")
	public String insertExcelZip(@ModelAttribute("loginVO") LoginVO loginVO, final HttpServletRequest request,
			@RequestParam Map<String, Object> commandMap, ZipVO searchVO, Model model) throws Exception {
		String[] fileExtension = { "XLS", "XLSX" };

		model.addAttribute("searchList", searchVO.getSearchList());

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			return "egovframework/com/sym/ccm/zip/EgovCcmExcelZipRegist";
		}

		MultipartHttpServletRequest multiRequest = WebUtils.getNativeRequest(request,
				MultipartHttpServletRequest.class);

		// 2022.01 Possible null pointer dereference due to return value of called
		// method 議곗튂
		if (multiRequest != null) {

			final Map<String, MultipartFile> files = multiRequest.getFileMap();
			Iterator<Entry<String, MultipartFile>> itr = files.entrySet().iterator();

			while (itr.hasNext()) {
				Entry<String, MultipartFile> entry = itr.next();
				MultipartFile file = entry.getValue();
				String originalFilename = file.getOriginalFilename();
				if (StringUtils.isEmpty(originalFilename)) {
					continue;
				}
				String fileExtensionName = FilenameUtils.getExtension(originalFilename).toUpperCase();
				boolean isExist = Arrays.stream(fileExtension).anyMatch(fileExtensionName::equals);
				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				if (isExist) {
					try (InputStream fis = file.getInputStream();) {
						if (searchVO.getSearchList().equals("1")) {
							zipManageService.insertExcelZip(fis);
						} else {
							rdnmadZipService.insertExcelZip(fis);
						}
					}

				} else {
					LOGGER.info("xls, xlsx ?뚯씪 ??낅쭔 ?깅줉??媛?ν빀?덈떎.");
					return "egovframework/com/sym/ccm/zip/EgovCcmExcelZipRegist";
				}
			}
		}

		return "forward:/sym/ccm/zip/EgovCcmZipList.do";
	}

	/**
	 * ?고렪踰덊샇 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param zip
	 * @param model
	 * @return "egovframework/com/sym/ccm/zip/EgovCcmZipDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipDetail.do")
	public String selectZipDetail(@ModelAttribute("loginVO") LoginVO loginVO, Zip zip, ZipVO searchVO, ModelMap model)
			throws Exception {
		if (searchVO.getSearchList().equals("1")) {
			Zip vo = zipManageService.selectZipDetail(zip);
			model.addAttribute("result", vo);
			model.addAttribute("searchList", searchVO.getSearchList());
		} else {
			Zip vo = rdnmadZipService.selectZipDetail(zip);
			model.addAttribute("result", vo);
			model.addAttribute("searchList", searchVO.getSearchList());
		}
		model.addAttribute("searchVO", searchVO);

		return "egovframework/com/sym/ccm/zip/EgovCcmZipDetail";
	}

	/**
	 * ?고렪踰덊샇 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/zip/EgovCcmZipList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?고렪踰덊샇愿由?, listUrl = "/sym/ccm/zip/EgovCcmZipList.do", order = 1000, gid = 50)
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipList.do")
	public String selectZipList(@ModelAttribute("loginVO") LoginVO loginVO, @ModelAttribute("searchVO") ZipVO searchVO,
			ModelMap model) throws Exception {
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

		if (!searchVO.getSearchList().equals("2")) {
			List<EgovMap> resultList = zipManageService.selectZipList(searchVO);
			model.addAttribute("resultList", resultList);

			int totCnt = zipManageService.selectZipListTotCnt(searchVO);
			paginationInfo.setTotalRecordCount(totCnt);
			model.addAttribute("paginationInfo", paginationInfo);
		} else {
			List<EgovMap> resultList = rdnmadZipService.selectZipList(searchVO);
			model.addAttribute("resultList", resultList);

			int totCnt = rdnmadZipService.selectZipListTotCnt(searchVO);
			paginationInfo.setTotalRecordCount(totCnt);
			model.addAttribute("paginationInfo", paginationInfo);
		}

		return "egovframework/com/sym/ccm/zip/EgovCcmZipList";
	}

	/**
	 * ?고렪踰덊샇 ?섏젙?붾㈃
	 * 
	 * @param loginVO
	 * @param zip
	 * @param model
	 * @return "egovframework/com/sym/ccm/zip/EgovCcmZipModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipModifyView.do")
	public String updateZip(@ModelAttribute("loginVO") LoginVO loginVO, @ModelAttribute("zip") Zip zip, ZipVO searchVO,
			ModelMap model) throws Exception {
		model.addAttribute("searchList", searchVO.getSearchList());
		boolean isRoadAddr = "2".equals(searchVO.getSearchList());
		Zip vo = null;
		if (isRoadAddr) {
			vo = rdnmadZipService.selectZipDetail(zip);
		} else {
			vo = zipManageService.selectZipDetail(zip);
		}
		model.addAttribute("zip", vo);
		model.addAttribute("isRoadAddr", isRoadAddr);
		return "egovframework/com/sym/ccm/zip/EgovCcmZipModify";
	}

	/**
	 * ?고렪踰덊샇瑜??섏젙?쒕떎.
	 * 
	 * @param loginVO
	 * @param zip
	 * @param bindingResult
	 * @param searchVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovCcmZipModify.do")
	public String updateZip(@ModelAttribute("loginVO") LoginVO loginVO, @ModelAttribute("zip") Zip zip,
			BindingResult bindingResult, ZipVO searchVO, ModelMap model) throws Exception {
		if (zip.getSn() == 0) {
			return "redirect:/sym/ccm/zip/EgovCcmZipList.do";
		}
		boolean isRoadAddr = "2".equals(searchVO.getSearchList());
		if (!isRoadAddr && bindingResult.hasErrors()) {
			model.addAttribute("searchList", searchVO.getSearchList());
			return "egovframework/com/sym/ccm/zip/EgovCcmZipModify";
		}
		/*
		 * 2024-08-31 沅뚰깭??- 湲곗〈 肄붾뱶?먯꽌 ?꾨줈紐낆＜??????validate瑜?二쇱꽍 泥섎━?대몢??二쇱꽍???좎???else {
		 * beanValidator.validate(zip, bindingResult); if (bindingResult.hasErrors()){
		 * return "egovframework/com/sym/ccm/zip/EgovCcmZipModify"; } }
		 */

		zip.setLastUpdusrId(loginVO.getUniqId());
		if (isRoadAddr) {
			rdnmadZipService.updateZip(zip);
		} else {
			zipManageService.updateZip(zip);
		}
		return "redirect:/sym/ccm/zip/EgovCcmZipList.do";
	}

	/**
	 * 二쇱냼?뺣낫?곌퀎 ?앹뾽???꾪븳 ?낅젰 ?섏씠吏瑜??몄텧?쒕떎.
	 *
	 * @return
	 */
	@RequestMapping(value = "/sym/ccm/zip/EgovAdressPop.do")
	public String selectAddPop() {
		return "egovframework/com/sym/ccm/zip/EgovAdressPop";
	}
}
