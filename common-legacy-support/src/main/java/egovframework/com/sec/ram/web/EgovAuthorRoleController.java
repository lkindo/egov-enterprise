package egovframework.com.sec.ram.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.sec.ram.service.AuthorRoleManage;
import egovframework.com.sec.ram.service.AuthorRoleManageVO;
import egovframework.com.sec.ram.service.EgovAuthorRoleManageService;
import jakarta.annotation.Resource;

/**
 * ??? ???controller ?????? ???.
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
 *   2009.03.11  ??          ????
 *   2011.09.07  ?????         ??????? ???????????? ??????
 *      </pre>
 **/
// @Controller
public class EgovAuthorRoleController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovAuthorRoleManageService")
	private EgovAuthorRoleManageService egovAuthorRoleManageService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?????? ???
	 * 
	 * @return "egovframework com/sec/ram/EgovDeptAuthorList"   
	 * @exception Exception
	 */
	@RequestMapping("/sec/ram/EgovAuthorRoleListView.do")
	public String selectAuthorRoleListView() throws Exception {

		return "egovframework/com/sec/ram/EgovAuthorRoleManage";
	}

	/**
	 * ????????
	 *
	 * @param authorRoleManageVO AuthorRoleManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/ram/EgovAuthorRoleList.do")
	public String selectAuthorRoleList(@ModelAttribute("authorRoleManageVO") AuthorRoleManageVO authorRoleManageVO,
			ModelMap model) throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(authorRoleManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(authorRoleManageVO.getPageUnit());
		paginationInfo.setPageSize(authorRoleManageVO.getPageSize());

		authorRoleManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		authorRoleManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		authorRoleManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		authorRoleManageVO.setAuthorRoleList(egovAuthorRoleManageService.selectAuthorRoleList(authorRoleManageVO));
		model.addAttribute("authorRoleList", authorRoleManageVO.getAuthorRoleList());
		model.addAttribute("searchVO", authorRoleManageVO);

		int totCnt = egovAuthorRoleManageService.selectAuthorRoleListTotCnt(authorRoleManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sec/ram/EgovAuthorRoleManage";
	}

	/**
	 * ???????? ???????
	 * 
	 * @param authorCode       String
	 * @param roleCodes        String
	 * @param regYns           String
	 * @param authorRoleManage AuthorRoleManage
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/ram/EgovAuthorRoleInsert.do")
	public String insertAuthorRole(@RequestParam("authorCode") String authorCode,
			@RequestParam("roleCodes") String roleCodes,
			@RequestParam("regYns") String regYns,
			@RequestParam Map<?, ?> commandMap,
			@ModelAttribute("authorRoleManage") AuthorRoleManage authorRoleManage,
			ModelMap model) throws Exception {

		String[] strRoleCodes = roleCodes.split(";");
		String[] strRegYns = regYns.split(";");

		authorRoleManage.setRoleCode(authorCode);

		for (int i = 0; i < strRoleCodes.length; i++) {

			authorRoleManage.setRoleCode(strRoleCodes[i]);
			authorRoleManage.setRegYn(strRegYns[i]);
			if (strRegYns[i].equals("Y")) {
				egovAuthorRoleManageService.deleteAuthorRole(authorRoleManage);// 2011.09.07
				egovAuthorRoleManageService.insertAuthorRole(authorRoleManage);
			} else {
				egovAuthorRoleManageService.deleteAuthorRole(authorRoleManage);
			}
		}

		return "redirect:/sec/ram/EgovAuthorRoleList.do?searchKeyword=" + authorCode;
	}
}
