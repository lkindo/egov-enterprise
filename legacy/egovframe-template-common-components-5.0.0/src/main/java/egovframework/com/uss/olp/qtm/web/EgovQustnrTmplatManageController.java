package egovframework.com.uss.olp.qtm.web;

import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.ObjectUtils;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olp.qtm.service.EgovQustnrTmplatManageService;
import egovframework.com.uss.olp.qtm.service.QustnrTmplatManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

/**
 * ?ㅻЦ?쒗뵆由?Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??               ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2009.03.20   ?λ룞??           理쒖큹 ?앹꽦
 *  2011.08.26   ?뺤쭊??           IncludedInfo annotation 異붽?
 *  2020.10.30   ?좎슜??           ?뚯씪?낅줈???쒗븳?꾩쐞???뚮씪誘명꽣 ?꾨떖
 *  2022.11.11   源?쒖?			   ?쒗걧?댁퐫??泥섎━
 *
 * </pre>
 */

@Controller
public class EgovQustnrTmplatManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovQustnrTmplatManageController.class);

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovQustnrTmplatManageService")
	private EgovQustnrTmplatManageService egovQustnrTmplatManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageMain.do")
	public String egovQustnrTmplatManageMain(ModelMap model) throws Exception {
		return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageMain";
	}

	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageLeft.do")
	public String egovQustnrTmplatManageLeft(ModelMap model) throws Exception {
		return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageLeft";
	}

	/**
	 * 媛쒕퀎 諛고룷??硫붿씤硫붾돱瑜?議고쉶?쒕떎.
	 * @param model
	 * @return	"/uss/sam/cpy/"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/EgovMain.do")
	public String egovMain(ModelMap model) throws Exception {
		return "egovframework/com/uss/olp/qtm/EgovMain";
	}

	/**
	 * 硫붾돱瑜?議고쉶?쒕떎.
	 * @param model
	 * @return	"/uss/sam/cpy/EgovLeft"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/EgovLeft.do")
	public String egovLeft(ModelMap model) throws Exception {
		return "egovframework/com/uss/olp/qtm/EgovLeft";
	}

	/**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrTmplatManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?ㅻЦ?쒗뵆由욧?由?, order = 610, gid = 50)
	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageList.do")
	public String egovQustnrTmplatManageList(
		@ModelAttribute("searchVO") ComDefaultVO searchVO,
		@RequestParam Map<?, ?> commandMap,
		QustnrTmplatManageVO qustnrTmplatManageVO,
		ModelMap model)
		throws Exception {

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovQustnrTmplatManageService.deleteQustnrTmplatManage(qustnrTmplatManageVO);
		}

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

		List<EgovMap> resultList = egovQustnrTmplatManageService.selectQustnrTmplatManageList(searchVO);
        model.addAttribute("resultList", resultList);

		model.addAttribute("searchKeyword",
			commandMap.get("searchKeyword") == null ? "" : (String)commandMap.get("searchKeyword"));
		model.addAttribute("searchCondition",
			commandMap.get("searchCondition") == null ? "" : (String)commandMap.get("searchCondition"));

		int totCnt = egovQustnrTmplatManageService.selectQustnrTmplatManageListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageList";
	}

	/**
	 * ?ㅻЦ?쒗뵆由??대?吏 紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * @param request
	 * @param response
	 * @param qustnrTmplatManageVO
	 * @param commandMap
	 * @return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageImg"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageImg.do")
	public void egovQustnrTmplatManageImg(
		HttpServletRequest request,
		HttpServletResponse response,
		QustnrTmplatManageVO qustnrTmplatManageVO,
		@RequestParam Map<?, ?> commandMap) throws Exception {

		Map<?, ?> mapResult = egovQustnrTmplatManageService
			.selectQustnrTmplatManageTmplatImagepathnm(qustnrTmplatManageVO);

		byte[] img = (byte[])mapResult.get("QUSTNR_TMPLAT_IMAGE_INFOPATHNM");

		String imgtype = "jpeg";
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		response.setHeader("Content-Type", imgtype);
		response.setHeader("Content-Length", "" + img.length);
		response.getOutputStream().write(img);
		response.getOutputStream().flush();
		response.getOutputStream().close();
	}

	/**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * @param searchVO
	 * @param qustnrTmplatManageVO
	 * @param commandMap
	 * @param model
	 * @return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageDetail.do")
	public String egovQustnrTmplatManageDetail(
		@ModelAttribute("searchVO") ComDefaultVO searchVO,
		QustnrTmplatManageVO qustnrTmplatManageVO,
		@RequestParam Map<?, ?> commandMap,
		ModelMap model)
		throws Exception {

		String sLocationUrl = "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageDetail";

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");

		if (sCmd.equals("del")) {
			egovQustnrTmplatManageService.deleteQustnrTmplatManage(qustnrTmplatManageVO);
			sLocationUrl = "redirect:/uss/olp/qtm/EgovQustnrTmplatManageList.do";
		} else {
			List<EgovMap> resultList = egovQustnrTmplatManageService.selectQustnrTmplatManageDetail(qustnrTmplatManageVO);
            model.addAttribute("resultList", resultList);
		}

		return sLocationUrl;
	}

	/**
	 * ?ㅻЦ?쒗뵆由용? ?섏젙?쒕떎.
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrTmplatManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageModify.do")
	public String qustnrTmplatManageModify(
		@ModelAttribute("searchVO") ComDefaultVO searchVO,
		@RequestParam Map<?, ?> commandMap,
		QustnrTmplatManageVO qustnrTmplatManageVO,
		ModelMap model)
		throws Exception {
		String sLocationUrl = "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageModify";

//		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");

		List<EgovMap> resultList = egovQustnrTmplatManageService.selectQustnrTmplatManageDetail(qustnrTmplatManageVO);
        model.addAttribute("resultList", resultList);

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return sLocationUrl;
	}

	/**
	 * ?ㅻЦ?쒗뵆由용? ?섏젙泥섎━ ?쒕떎.
	 * @param multiRequest
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrTmplatManageVO
	 * @param bindingResult
	 * @param model
	 * @return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageModifyActor"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageModifyActor.do")
	public String qustnrTmplatManageModifyActor(
		final MultipartHttpServletRequest multiRequest,
		@ModelAttribute("searchVO") ComDefaultVO searchVO,
		@RequestParam Map<?, ?> commandMap,
		@Valid @ModelAttribute("qustnrTmplatManageVO") QustnrTmplatManageVO qustnrTmplatManageVO,
		BindingResult bindingResult,
		ModelMap model)
		throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			List<EgovMap> resultList = egovQustnrTmplatManageService.selectQustnrTmplatManageDetail(qustnrTmplatManageVO);
            model.addAttribute("resultList", resultList);

			// ?뚯씪?낅줈???쒗븳
			String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
			String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

			model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
			model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);
			return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageModify";
		}

		//?꾩씠???ㅼ젙
		qustnrTmplatManageVO
			.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		qustnrTmplatManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		final Map<String, MultipartFile> files = multiRequest.getFileMap();

		if (!files.isEmpty()) {
			for (MultipartFile file : files.values()) {
				LOGGER.info("getName => {}", file.getName());
				LOGGER.info("getOriginalFilename => {}", file.getOriginalFilename());

				// ?뚯씪 ?섏젙?щ? ?뺤씤
				if (file.getOriginalFilename() != "") {
					if (file.getName().equals("qestnrTmplatImage")) {
						qustnrTmplatManageVO.setQestnrTmplatImagepathnm(file.getBytes());
					}
				}
			}
		}
		egovQustnrTmplatManageService.updateQustnrTmplatManage(qustnrTmplatManageVO);

		return "redirect:/uss/olp/qtm/EgovQustnrTmplatManageList.do";
	}

	/**
	 * ?ㅻЦ?쒗뵆由용? ?깅줉?쒕떎. / 珥덇린?깅줉?섏씠吏
	 * @param searchVO
	 * @param commandMap
	 * @param qustnrTmplatManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageRegist.do")
	public String qustnrTmplatManageRegist(
		@ModelAttribute("searchVO") ComDefaultVO searchVO,
		@RequestParam Map<?, ?> commandMap,
		@ModelAttribute("qustnrTmplatManageVO") QustnrTmplatManageVO qustnrTmplatManageVO,
		ModelMap model)
		throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageRegist";

		String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd");
		LOGGER.info("cmd => {}", sCmd);

		//?꾩씠???ㅼ젙
		qustnrTmplatManageVO
			.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		qustnrTmplatManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions.Images");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return sLocationUrl;
	}

	/**
	 * ?ㅻЦ?쒗뵆由용? ?깅줉 泥섎━ ?쒕떎.  / ?깅줉泥섎━
	 * @param multiRequest
	 * @param searchVO
	 * @param qustnrTmplatManageVO
	 * @param model
	 * @return "egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageRegistActor"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olp/qtm/EgovQustnrTmplatManageRegistActor.do")
	public String qustnrTmplatManageRegistActor(
		final MultipartHttpServletRequest multiRequest,
		@ModelAttribute("searchVO") ComDefaultVO searchVO,
		QustnrTmplatManageVO qustnrTmplatManageVO,
		ModelMap model)
		throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		//?꾩씠???ㅼ젙
		qustnrTmplatManageVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		qustnrTmplatManageVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		final Map<String, MultipartFile> files = multiRequest.getFileMap();

		if (files != null && !files.isEmpty()) {
			for (MultipartFile file : files.values()) {
				LOGGER.info("getName => {}", file.getName()); // ?뚯씪???뚮씪誘명꽣 ?대쫫
				LOGGER.info("getOriginalFilename => {}", file.getOriginalFilename()); // ?뚯씪???ㅼ젣 ?대쫫

				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				if (ObjectUtils.isNotEmpty(file.getName()) && ObjectUtils.isNotEmpty(file.getOriginalFilename())) {
					qustnrTmplatManageVO.setQestnrTmplatImagepathnm(file.getBytes());
				}
			}
		}

		egovQustnrTmplatManageService.insertQustnrTmplatManage(qustnrTmplatManageVO);

		return "redirect:/uss/olp/qtm/EgovQustnrTmplatManageList.do";
	}

}
