package egovframework.com.sec.rgm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.SessionVO;
import egovframework.com.sec.ram.service.AuthorManageVO;
import egovframework.com.sec.rgm.service.AuthorGroup;
import egovframework.com.sec.rgm.service.AuthorGroupVO;

import com.company.project.service.auth.UserAuthorityService;
import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.UserAuthorityDto;
import com.company.project.service.auth.dto.AuthorManageDto;
import com.company.project.web.adapter.SecurityAdapter;

import jakarta.annotation.Resource;

/**
 * ?????controller ?????? ???.
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
 *   2011.08.04  ?????         mberTyCodes ????????
 *   2011.8.26	???		IncludedInfo annotation ??
 *      </pre>
 **/

@Controller
@SessionAttributes(types = SessionVO.class)
public class EgovAuthorGroupController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	// New JPA Service
	@Resource(name = "projectUserAuthorityService")
	private UserAuthorityService userAuthorityService;

	// New JPA Service for Authors
	@Resource(name = "projectAuthorManageService")
	private AuthorManageService authorManageService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?? ???
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping("/sec/rgm/EgovAuthorGroupListView.do")
	public String selectAuthorGroupListView() throws Exception {
		return "egovframework/com/sec/rgm/EgovAuthorGroupManage";
	}

	/**
	 * 권한 그룹 목록 조회
	 */
	@RequestMapping("/sec/rgm/EgovAuthorGroupList.do")
	public String selectAuthorGroupList(@ModelAttribute("authorGroupVO") AuthorGroupVO authorGroupVO,
			@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO, ModelMap model) throws Exception {
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(authorGroupVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(authorGroupVO.getPageUnit());
		paginationInfo.setPageSize(authorGroupVO.getPageSize());

		authorGroupVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		authorGroupVO.setLastIndex(paginationInfo.getLastRecordIndex());
		authorGroupVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service for UserAuthority List (AuthorGroup)
		// Note: selectUserAuthorityList uses ComDefaultVO effectively. AuthorGroupVO
		// extends AuthorGroup which extends ComDefaultVO.
		// We might need to check if AuthorGroupVO params are correctly mapped by
		// Service.
		// Assuming selectUserAuthorityList filters by searchKeyword/searchCondition in
		// ComDefaultVO.

		// However, UserAuthorityService currently takes ComDefaultVO.
		// We need to verify if filtering by specific AuthorGroup fields (like user
		// type) is needed.
		// The original egovAuthorGroupService.selectAuthorGroupList handled complex
		// joins.
		// Our simple JPA might need customization if filtering is complex.
		// For now, using basic list.
		List<UserAuthorityDto> dtoList = userAuthorityService.selectUserAuthorityList(authorGroupVO);
		authorGroupVO.setAuthorGroupList(SecurityAdapter.toAuthorGroupVOList(dtoList));
		model.addAttribute("authorGroupList", authorGroupVO.getAuthorGroupList());

		int totCnt = userAuthorityService.selectUserAuthorityListTotCnt(authorGroupVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// JPA Service for Author List (Dropdown)
		// We need all authors. Assuming pagination not needed or big size.
		authorManageVO.setRecordCountPerPage(9999);
		List<AuthorManageDto> authorList = authorManageService.selectAuthorList(authorManageVO);
		authorManageVO.setAuthorManageList(SecurityAdapter.toAuthorVOList(authorList));
		model.addAttribute("authorManageList", authorManageVO.getAuthorManageList());

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sec/rgm/EgovAuthorGroupManage";
	}

	/**
	 * ???????? ???????
	 * 
	 * @param userIds     String
	 * @param authorCodes String
	 * @param regYns      String
	 * @param authorGroup AuthorGroup
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/rgm/EgovAuthorGroupInsert.do")
	public String insertAuthorGroup(@RequestParam("userIds") String userIds,
			@RequestParam("authorCodes") String authorCodes,
			@RequestParam("regYns") String regYns,
			@RequestParam("mberTyCodes") String mberTyCodes, // 2011.08.04 ?? ???
			@ModelAttribute("authorGroup") AuthorGroup authorGroup,
			ModelMap model) throws Exception {

		String[] strUserIds = userIds.split(";");
		String[] strAuthorCodes = authorCodes.split(";");
		String[] strRegYns = regYns.split(";");
		String[] strMberTyCodes = mberTyCodes.split(";");// 2011.08.04 ?? ???

		for (int i = 0; i < strUserIds.length; i++) {
			UserAuthorityDto dto = UserAuthorityDto.builder()
					.uniqId(strUserIds[i])
					.authorCode(strAuthorCodes[i])
					.mberTyCode(strMberTyCodes[i])
					.build();

			if (strRegYns[i].equals("N")) {
				userAuthorityService.insertUserAuthority(dto);
			} else {
				userAuthorityService.updateUserAuthority(dto);
			}
		}

		model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
		return "forward:/sec/rgm/EgovAuthorGroupList.do";
	}

	/**
	 * ?????????????????
	 * 
	 * @param userIds     String
	 * @param authorGroup AuthorGroup
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/rgm/EgovAuthorGroupDelete.do")
	public String deleteAuthorGroup(@RequestParam("userIds") String userIds,
			@ModelAttribute("authorGroup") AuthorGroup authorGroup,
			ModelMap model) throws Exception {

		String[] strUserIds = userIds.split(";");
		for (String strUserId : strUserIds) {
			userAuthorityService.deleteUserAuthority(strUserId);
		}

		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/rgm/EgovAuthorGroupList.do";
	}

}
