package egovframework.com.sec.ram.web;

import java.util.List;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.SessionVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sec.ram.service.AuthorManage;
import egovframework.com.sec.ram.service.AuthorManageVO;
import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import com.company.project.web.adapter.SecurityAdapter;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;

import jakarta.annotation.Resource;

/**
 * 권한관리에 관한 controller 클래스를 정의한다.
 * 
 * @author 공통서비스 개발팀 이문준
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *   
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.03.20  이문준          최초 생성
 *   2011.08.26  정진오          IncludedInfo annotation 추가
 *   2022.11.11  김혜준          시큐어코딩 처리
 *
 *      </pre>
 */

// @Controller
@SessionAttributes(types = SessionVO.class)
public class EgovAuthorManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	// New JPA Service
	@Resource(name = "projectAuthorManageService")
	private AuthorManageService authorManageService;

	/**
	 * 권한 목록화면 이동
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/sec/ram/EgovAuthorListView.do")
	public String selectAuthorListView() throws Exception {
		return "sec/ram/EgovAuthorManage";
	}

	/**
	 * 권한 목록을 조회한다
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
	@IncludedInfo(name = "권한관리", listUrl = "/sec/ram/EgovAuthorList.do", order = 60, gid = 20)
	// @RequestMapping(value = "/sec/ram/EgovAuthorList.do")
	public String selectAuthorList(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		/** EgovPropertyService.sample */
		authorManageVO.setPageUnit(propertiesService.getInt("pageUnit"));
		authorManageVO.setPageSize(propertiesService.getInt("pageSize"));

		/** paging */
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
	 * 권한 세부정보를 조회한다
	 * 
	 * @param authorCode     String
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/sec/ram/EgovAuthor.do")
	public String selectAuthor(@RequestParam("authorCode") String authorCode,
			@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model) throws Exception {

		System.out.println("DEBUG: selectAuthor called with authorCode=" + authorCode);

		AuthorManageDto dto = authorManageService.selectAuthor(authorCode);

		if (dto == null) {
			System.out.println("DEBUG: selectAuthor dto is NULL for code=" + authorCode);
			AuthorManageVO emptyVO = new AuthorManageVO();
			emptyVO.setAuthorCode(authorCode);
			model.addAttribute("authorManage", emptyVO);
			model.addAttribute("message", "해당 권한을 찾을 수 없습니다.");
		} else {
			System.out.println("DEBUG: selectAuthor found dto=" + dto);
			model.addAttribute("authorManage", SecurityAdapter.toVO(dto));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		}

		return "sec/ram/EgovAuthorUpdate";
	}

	/**
	 * 권한 등록화면으로 이동한다
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/sec/ram/EgovAuthorInsertView.do")
	public String insertAuthorView(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO) throws Exception {
		return "sec/ram/EgovAuthorInsert";
	}

	/**
	 * 권한을 등록한다
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/sec/ram/EgovAuthorInsert.do")
	public String insertAuthor(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		AuthorManageDto dto = SecurityAdapter.toDto(authorManageVO);
		authorManageService.insertAuthor(dto);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * 권한을 수정한다
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/sec/ram/EgovAuthorUpdate.do")
	public String updateAuthor(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		AuthorManageDto dto = SecurityAdapter.toDto(authorManageVO);
		authorManageService.updateAuthor(dto);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * 권한을 삭제한다
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/sec/ram/EgovAuthorDelete.do")
	public String deleteAuthor(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model)
			throws Exception {

		authorManageService.deleteAuthor(authorManageVO.getAuthorCode());
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * 권한 목록을 삭제한다
	 * 
	 * @param authorCodes    String
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/sec/ram/EgovAuthorListDelete.do")
	public String deleteAuthorList(@RequestParam("authorCodes") String authorCodes,
			@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model) throws Exception {

		String[] strAuthorCodes = authorCodes.split(";");
		authorManageService.deleteAuthors(strAuthorCodes);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * 권한제한 화면 이동
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping("/sec/ram/accessDenied.do")
	public String accessDenied() throws Exception {
		return "sec/accessDenied";
	}
}
