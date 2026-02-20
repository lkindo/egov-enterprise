package egovframework.com.uss.olh.wor.web;

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

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olh.wor.service.EgovWordDicaryService;
import egovframework.com.uss.olh.wor.service.WordDicaryVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
*
* ?⑹뼱?ъ쟾??泥섎━?섎뒗 Controller ?대옒??
* @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
* @since 2009.04.01
* @version 1.0
* @see
*
* <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*   ?섏젙??     ?섏젙??          ?섏젙?댁슜
*  -------    --------    ---------------------------
*   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
*   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
*   2016.08.02	源?고샇			?쒖??꾨젅?꾩썙??3.6 ?곸슜
*
*
* </pre>
*/
@Controller
public class EgovWordDicaryController {

	@Resource(name = "EgovWordDicaryService")
	private EgovWordDicaryService egovWordDicaryService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?⑹뼱?ъ쟾紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @param model
	 * @return	"/uss/olh/wor/EgovWordDicaryListInqire"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?⑹뼱?ъ쟾", order = 530, gid = 50)
	@RequestMapping(value = "/uss/olh/wor/selectWordDicaryList.do")
	public String selectWordDicaryList(@ModelAttribute("searchVO") WordDicaryVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.WordDicaryList */
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

		List<WordDicaryVO> wordDicaryList = egovWordDicaryService.selectWordDicaryList(searchVO);
		model.addAttribute("resultList", wordDicaryList);

		int totCnt = egovWordDicaryService.selectWordDicaryListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/wor/EgovWordDicaryList";
	}

	/**
	 * ?⑹뼱?ъ쟾 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param wordDicaryVO
	 * @param searchVO
	 * @param model
	 * @return	"/uss/olh/wor/EgovWordDicaryDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/wor/selectWordDicaryDetail.do")
	public String selectWordDicaryDetail(WordDicaryVO wordDicaryVO, @ModelAttribute("searchVO") WordDicaryVO searchVO, ModelMap model) throws Exception {

		WordDicaryVO vo = egovWordDicaryService.selectWordDicaryDetail(wordDicaryVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/wor/EgovWordDicaryDetail";
	}

	/**
	 * ?⑹뼱?ъ쟾?뺣낫瑜??깅줉?섍린 ?꾪븳 泥??붾㈃
	 * @param searchVO
	 * @param model
	 * @return	"/uss/olh/wor/EgovWordDicaryRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/wor/insertWordDicaryView.do")
	public String insertWordDicaryView(@ModelAttribute("searchVO") WordDicaryVO searchVO, Model model) throws Exception {

		model.addAttribute("wordDicaryVO", new WordDicaryVO());

		return "egovframework/com/uss/olh/wor/EgovWordDicaryRegist";
	}

	/**
	 * ?⑹뼱?ъ쟾?뺣낫瑜??깅줉?쒕떎.
	 * @param searchVO
	 * @param wordDicaryVO
	 * @param bindingResult
	 * @param model
	 * @return	"forward:/uss/olh/wor/selectWordDicaryList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/wor/insertWordDicary.do")
	public String insertWordDicary(
		@ModelAttribute("searchVO") WordDicaryVO searchVO,
		@Valid @ModelAttribute("wordDicaryVO") WordDicaryVO wordDicaryVO,
		BindingResult bindingResult, Model model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/wor/EgovWordDicaryRegist";
		}

		// 濡쒓렇?퇦O?먯꽌  ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		wordDicaryVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		wordDicaryVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovWordDicaryService.insertWordDicary(wordDicaryVO);

		return "forward:/uss/olh/wor/selectWordDicaryList.do";
	}

	/**
	 * ?⑹뼱?ъ쟾?뺣낫瑜??섏젙?섍린 ?꾪븳 珥덇린 ?붾㈃
	 * @param wordId
	 * @param searchVO
	 * @param model
	 * @return	"/uss/olh/wor/EgovWordDicaryUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/wor/updateWordDicaryView.do")
	public String updateWordDicaryView(@RequestParam("wordId") String wordId, @ModelAttribute("searchVO") WordDicaryVO searchVO, ModelMap model) throws Exception {

		WordDicaryVO wordDicaryVO = new WordDicaryVO();
		wordDicaryVO.setWordId(wordId);

		model.addAttribute("wordDicaryVO", egovWordDicaryService.selectWordDicaryDetail(wordDicaryVO));

		return "egovframework/com/uss/olh/wor/EgovWordDicaryUpdt";
	}

	/**
	 * ?⑹뼱?ъ쟾?뺣낫瑜??섏젙?쒕떎.
	 * @param searchVO
	 * @param wordDicaryVO
	 * @param bindingResult
	 * @param model
	 * @return	"forward:/uss/olh/wor/selectWordDicaryList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/wor/updateWordDicary.do")
	public String updateWordDicary(
		@ModelAttribute("searchVO") WordDicaryVO searchVO,
		@Valid @ModelAttribute("wordDicaryVO") WordDicaryVO wordDicaryVO,
		BindingResult bindingResult, Model model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/wor/EgovWordDicaryUpdt";
		}

		// 濡쒓렇?퇦O?먯꽌  ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		wordDicaryVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D
		egovWordDicaryService.updateWordDicary(wordDicaryVO);

		return "forward:/uss/olh/wor/selectWordDicaryList.do";
	}

	/**
	 * ?⑹뼱?ъ쟾?뺣낫瑜???젣?쒕떎.
	 * @param wordDicaryVO
	 * @param searchVO
	 * @return	"forward:/uss/olh/wor/selectWordDicaryList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/wor/deleteWordDicary.do")
	public String deleteWordDicary(WordDicaryVO wordDicaryVO, @ModelAttribute("searchVO") WordDicaryVO searchVO) throws Exception {

		egovWordDicaryService.deleteWordDicary(wordDicaryVO);

		return "forward:/uss/olh/wor/selectWordDicaryList.do";
	}

}
