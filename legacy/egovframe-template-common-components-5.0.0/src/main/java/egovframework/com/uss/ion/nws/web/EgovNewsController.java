package egovframework.com.uss.ion.nws.web;

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
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.nws.service.EgovNewsService;
import egovframework.com.uss.ion.nws.service.NewsVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?댁뒪?뺣낫瑜?泥섎━?섎뒗 Controller ?대옒??
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
 *   2025.08.11  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovNewsController {

	@Resource(name = "EgovNewsService")
	private EgovNewsService egovNewsService;

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
	 * ?댁뒪?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/nws/EgovNewsList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?댁뒪愿由?, order = 670, gid = 50)
	@RequestMapping(value = "/uss/ion/nws/selectNewsList.do")
	public String selectNewsList(@ModelAttribute("searchVO") NewsVO searchVO, ModelMap model) throws Exception {

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

		List<NewsVO> resultList = egovNewsService.selectNewsList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovNewsService.selectNewsListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/nws/EgovNewsList";
	}

	/**
	 * ?댁뒪?뺣낫 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param newsVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/nws/EgovNewsDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/nws/selectNewsDetail.do")
	public String selectNewsDetail(NewsVO newsVO, @ModelAttribute("searchVO") NewsVO searchVO, ModelMap model)
			throws Exception {

		NewsVO vo = egovNewsService.selectNewsDetail(newsVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/ion/nws/EgovNewsDetail";
	}

	/**
	 * ?댁뒪?뺣낫瑜??깅줉 ???④퀎泥섎━
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/nws/EgovNewsRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/nws/insertNewsView.do")
	public String insertNewsView(@ModelAttribute("searchVO") NewsVO searchVO, Model model) throws Exception {

		model.addAttribute("newsVO", new NewsVO());

		return "egovframework/com/uss/ion/nws/EgovNewsRegist";

	}

	/**
	 * ?댁뒪?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param multiRequest
	 * @param searchVO
	 * @param newsVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/nws/selectNewsList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/nws/insertNews.do")
	public String insertNews(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") NewsVO searchVO, @ModelAttribute("newsVO") NewsVO newsVO,
			BindingResult bindingResult) throws Exception {

		// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
		List<FileVO> fvoList = null;
		String atchFileId = "";

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "NEWS_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
		}

		// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
		newsVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

		if(bindingResult.hasErrors()){

			return "egovframework/com/uss/ion/nws/EgovNewsRegist";

		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		newsVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		newsVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovNewsService.insertNews(newsVO);

		return "forward:/uss/ion/nws/selectNewsList.do";
	}

	/**
	 * ?댁뒪?뺣낫瑜??섏젙?섍린 ???④퀎泥섎━
	 * 
	 * @param newsId
	 * @param searchVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/nws/updateNewsView.do")
	public String updateNewsView(@RequestParam("newsId") String newsId, @ModelAttribute("searchVO") NewsVO searchVO,
			ModelMap model) throws Exception {

		NewsVO newsVO = new NewsVO();

		// Primary Key 媛??명똿
		newsVO.setNewsId(newsId);
		model.addAttribute("newsVO", egovNewsService.selectNewsDetail(newsVO));

		return "egovframework/com/uss/ion/nws/EgovNewsUpdt";
	}

	/**
	 * ?댁뒪?뺣낫瑜??섏젙 泥섎━?쒕떎
	 * 
	 * @param atchFileAt
	 * @param multiRequest
	 * @param searchVO
	 * @param newsVO
	 * @param bindingResult
	 * @param model
	 * @return "forward:/uss/ion/nws/NewsInfoListInqire.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/nws/updateNews.do")
	public String updateNewsInfo(final MultipartHttpServletRequest multiRequest,
			@ModelAttribute("searchVO") NewsVO searchVO, @ModelAttribute("newsVO") NewsVO newsVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/nws/EgovNewsInfoUpdt";
		}

		// 泥⑤??뚯씪 愿??ID ?앹꽦 start....
		String atchFileId = newsVO.getAtchFileId();

		//
                     Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			if ("".equals(atchFileId)) {
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "NEWS_", 0, atchFileId, "");
				atchFileId = fileMngService.insertFileInfs(fvoList);
				newsVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int fileKeyParam = fileMngService.getMaxFileSN(fvo);
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "NEWS_", fileKeyParam, atchFileId, "");
				fileMngService.updateFileInfs(fvoList);
			}
		}
		// 泥⑤??뚯씪 愿??ID ?앹꽦 end...

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		newsVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		egovNewsService.updateNews(newsVO);

		return "forward:/uss/ion/nws/selectNewsList.do";

	}

	/**
	 * ?댁뒪?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param newsVO
	 * @param searchVO
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/nws/deleteNews.do")
	public String deleteNews(NewsVO newsVO, @ModelAttribute("searchVO") NewsVO searchVO) throws Exception {

		egovNewsService.deleteNews(newsVO);

		return "forward:/uss/ion/nws/selectNewsList.do";
	}

}
