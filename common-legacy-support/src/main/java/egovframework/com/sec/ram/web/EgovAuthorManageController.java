package egovframework.com.sec.ram.web;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.SessionVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sec.ram.service.AuthorManageVO;
import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import com.company.project.web.adapter.SecurityAdapter;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;

import jakarta.annotation.Resource;

/**
 * ?? ???controller ?????? ???.
 * 
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ??          ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2022.11.11  ???          ????????
 *
 *      </pre>
 **/

// @Controller
@SessionAttributes(types = SessionVO.class)
public class EgovAuthorManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovAuthorManageController.class);

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// New JPA Service
	@Resource(name = "projectAuthorManageService")
	private AuthorManageService authorManageService;

	/**
	 * ?? ???
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping("/sec/ram/EgovAuthorListView.do")
	public String selectAuthorListView() throws Exception {
		return "sec/ram/EgovAuthorManage";
	}

	/**
	 * ??????
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@IncludedInfo(name = "Legacy Controller", listUrl = "/sec/ram/EgovAuthorList.do", order = 60, gid = 20)
	// @RequestMapping(value = "/sec/ram/EgovAuthorList.do")
	public String selectAuthorList(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		/** EgovPropertyService.sample **/
		authorManageVO.setPageUnit(propertiesService.getInt("pageUnit"));
		authorManageVO.setPageSize(propertiesService.getInt("pageSize"));

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(authorManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(authorManageVO.getPageUnit());
		paginationInfo.setPageSize(authorManageVO.getPageSize());

		authorManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		authorManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		authorManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service Call
		List<AuthorManageDto> dtoList = authorManageService.selectAuthorList(authorManageVO);
		authorManageVO.setAuthorManageList(SecurityAdapter.toAuthorVOList(dtoList));
		model.addAttribute("authorList", authorManageVO.getAuthorManageList());

		int totCnt = authorManageService.selectAuthorListTotCnt(authorManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "sec/ram/EgovAuthorManage";
	}

	/**
	 * ?????????
	 * 
	 * @param authorCode     String
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/ram/EgovAuthor.do")
	public String selectAuthor(@RequestParam("authorCode") String authorCode,
			@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model) throws Exception {

		LOGGER.debug("DEBUG: selectAuthor called with authorCode={}", authorCode);

		AuthorManageDto dto = authorManageService.selectAuthor(authorCode);

		if (dto == null) {
			LOGGER.debug("DEBUG: selectAuthor dto is NULL for code={}", authorCode);
			AuthorManageVO emptyVO = new AuthorManageVO();
			emptyVO.setAuthorCode(authorCode);
			model.addAttribute("authorManage", emptyVO);
			model.addAttribute("message", "??  ??            ??         ??????      ??      .");
		} else {
			LOGGER.debug("DEBUG: selectAuthor found dto={}", dto);
			model.addAttribute("authorManage", SecurityAdapter.toVO(dto));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		}

		return "sec/ram/EgovAuthorUpdate";
	}

	/**
	 * ????? ????
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping("/sec/ram/EgovAuthorInsertView.do")
	public String insertAuthorView(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO) throws Exception {
		return "sec/ram/EgovAuthorInsert";
	}

	/**
	 * ?????
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/ram/EgovAuthorInsert.do")
	public String insertAuthor(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		AuthorManageDto dto = SecurityAdapter.toDto(authorManageVO);
		authorManageService.insertAuthor(dto);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * ??????
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/ram/EgovAuthorUpdate.do")
	public String updateAuthor(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		AuthorManageDto dto = SecurityAdapter.toDto(authorManageVO);
		authorManageService.updateAuthor(dto);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * ???????
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/ram/EgovAuthorDelete.do")
	public String deleteAuthor(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		authorManageService.deleteAuthor(authorManageVO.getAuthorCode());
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * ????????
	 * 
	 * @param authorCodes    String
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/ram/EgovAuthorListDelete.do")
	public String deleteAuthorList(@RequestParam("authorCodes") String authorCodes,
			@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model) throws Exception {

		String[] strAuthorCodes = authorCodes.split(";");
		authorManageService.deleteAuthors(strAuthorCodes);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * ?? ? ???
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping("/sec/ram/accessDenied.do")
	public String accessDenied() throws Exception {
		return "sec/accessDenied";
	}
}
