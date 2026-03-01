package egovframework.com.uss.olh.faq.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.service.Globals;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olh.faq.service.EgovFaqService;
import egovframework.com.uss.olh.faq.service.FaqVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * FAQ?댁슜??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2016.08.03  源?고샇          ?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *   2020.10.27  ?좎슜??         ?뚯씪 ?낅줈???섏젙 (multiRequest.getFiles)
 *   2021.07.29  ?뺤쭊??         寃쎈줈 ?ㅻ쪟 ?섏젙
 *   2025.08.20  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovFaqController {

	@Resource(name = "EgovFaqService")
	private EgovFaqService egovFaqService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// 泥⑤??뚯씪 愿??
	@Resource(name = "EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * FAQ 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/faq/EgovFaqList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "FAQ愿由?, order = 540, gid = 50)
	@RequestMapping(value = "/uss/olh/faq/selectFaqList.do")
	public String selectFaqList(@ModelAttribute("searchVO") FaqVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.SiteList */
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

		List<FaqVO> resultList = egovFaqService.selectFaqList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovFaqService.selectFaqListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/faq/EgovFaqList";
	}

	/**
	 * FAQ 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param faqVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/faq/EgovFaqDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/faq/selectFaqDetail.do")
	public String selectFaqDetail(FaqVO faqVO, @ModelAttribute("searchVO") FaqVO searchVO, ModelMap model)
			throws Exception {

		FaqVO vo = egovFaqService.selectFaqDetail(searchVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/faq/EgovFaqDetail";
	}

	/**
	 * FAQ瑜??깅줉?섍린 ?꾪븳 ??泥섎━
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/faq/EgovFaqRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/faq/insertFaqView.do")
	public String insertFaqView(@ModelAttribute("searchVO") FaqVO searchVO, Model model) throws Exception {

		model.addAttribute("faqVO", new FaqVO());

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = Globals.FILE_UP_EXTS;
		String fileUploadMaxSize = Globals.FILE_UP_MAX_SIZE;

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/uss/olh/faq/EgovFaqRegist";

	}

	/**
	 * FAQ瑜??깅줉?쒕떎.
	 * 
	 * @param multiRequest
	 * @param searchVO
	 * @param faqVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/faq/selectFaqList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/faq/insertFaq.do")
	public String insertFaqCn(final MultipartHttpServletRequest multiRequest, // 泥⑤??뚯씪???꾪븳...
			@ModelAttribute("searchVO") FaqVO searchVO, @ModelAttribute("faqManageVO") FaqVO faqVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/faq/EgovFaqRegist";
		}

		// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
		List<FileVO> fvoList = null;
		String atchFileId = "";

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "FAQ_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
		}

		// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
		faqVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		faqVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		faqVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovFaqService.insertFaq(faqVO);

		return "forward:/uss/olh/faq/selectFaqList.do";
	}

	/**
	 * FAQ瑜??섏젙?섍린 ?꾪븳 ??泥섎━
	 * 
	 * @param faqId
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/faq/EgovFaqUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/faq/updateFaqView.do")
	public String updateFaqView(@RequestParam("faqId") String faqId, @ModelAttribute("searchVO") FaqVO searchVO,
			ModelMap model) throws Exception {

		FaqVO faqVO = new FaqVO();

		// Primary Key 媛??명똿
		faqVO.setFaqId(faqId);

		// 蹂?섎챸? CoC ???곕씪 JSTL?ъ슜???꾪빐
		model.addAttribute("faqVO", egovFaqService.selectFaqDetail(faqVO));

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = Globals.FILE_UP_EXTS;
		String fileUploadMaxSize = Globals.FILE_UP_MAX_SIZE;

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return "egovframework/com/uss/olh/faq/EgovFaqUpdt";
	}

	/**
	 * FAQ瑜??섏젙泥섎━?쒕떎.
	 * 
	 * @param atchFileAt
	 * @param multiRequest
	 * @param searchVO
	 * @param faqVO
	 * @param bindingResult
	 * @param model
	 * @return "forward:/uss/olh/faq/selectFaqList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/faq/updateFaq.do")
	public String updateFaqCn(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") FaqVO searchVO, @ModelAttribute("faqVO") FaqVO faqVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/faq/EgovFaqUpdt";
		}

		// 泥⑤??뚯씪 愿??ID ?앹꽦 start....
		String atchFileId = faqVO.getAtchFileId();

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");
		if (!files.isEmpty()) {
			if (atchFileId == null || "".equals(atchFileId)) {
				List<FileVO> result = fileUtil.parseFileInf(files, "FAQ_", 0, atchFileId, "");
				atchFileId = fileMngService.insertFileInfs(result);
				faqVO.setAtchFileId(atchFileId);
			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int cnt = fileMngService.getMaxFileSN(fvo);
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "FAQ_", cnt, atchFileId, "");
				fileMngService.updateFileInfs(fvoList);
			}
		}
		// 泥⑤??뚯씪 愿??ID ?앹꽦 end...

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		faqVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		egovFaqService.updateFaq(faqVO);

		return "forward:/uss/olh/faq/selectFaqList.do";

	}

	/**
	 * FAQ瑜???젣泥섎━?쒕떎.
	 * 
	 * @param faqVO
	 * @param searchVO
	 * @return "forward:/uss/olh/faq/selectFaqList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/faq/deleteFaq.do")
	public String deleteFaq(FaqVO faqVO, @ModelAttribute("searchVO") FaqVO searchVO) throws Exception {

		// 泥⑤??뚯씪 ??젣瑜??꾪븳 ID ?앹꽦 start....
		String atchFileId = faqVO.getAtchFileId();

		egovFaqService.deleteFaq(faqVO);

		// 泥⑤??뚯씪????젣?섍린 ?꾪븳 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 泥⑤??뚯씪 ??젣 End.............

		return "forward:/uss/olh/faq/selectFaqList.do";
	}

}
