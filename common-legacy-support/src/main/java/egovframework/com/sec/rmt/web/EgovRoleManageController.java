package egovframework.com.sec.rmt.web;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.SessionVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.sec.ram.service.AuthorManageVO;
import egovframework.com.sec.rmt.service.RoleManage;
import egovframework.com.sec.rmt.service.RoleManageVO;

import com.company.project.service.auth.RoleManageService;
import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.RoleManageDto;
import com.company.project.web.adapter.SecurityAdapter;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;

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
 *   2009.03.11  ??          ????
 *   2011.8.26	???		IncludedInfo annotation ??
 *
 *      </pre>
 **/
// @Controller
@SessionAttributes(types = SessionVO.class)
public class EgovRoleManageController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovRoleManageController.class);

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	// New JPA Service
	@Resource(name = "projectRoleManageService")
	private RoleManageService roleManageService;

	@Resource(name = "EgovCmmUseService")
	EgovCmmUseService egovCmmUseService;

	// New JPA Service for Authors
	@Resource(name = "projectAuthorManageService")
	private AuthorManageService authorManageService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** Message ID Generation **/
	@Resource(name = "egovRoleIdGnrService")
	private EgovIdGnrService egovRoleIdGnrService;

	/**
	 * ?? ???
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping("/sec/rmt/EgovRoleListView.do")
	public String selectRoleListView()
			throws Exception {
		return "egovframework/com/sec/rmt/EgovRoleManage";
	}

	/**
	 * ????? ???
	 * 
	 * @param roleManageVO RoleManageVO
	 * @return String
	 * @exception Exception
	 **/
	@IncludedInfo(name = "Legacy Controller", listUrl = "/sec/rmt/EgovRoleList.do", order = 90, gid = 20)
	// @RequestMapping(value = "/sec/rmt/EgovRoleList.do")
	public String selectRoleList(@ModelAttribute("roleManageVO") RoleManageVO roleManageVO,
			ModelMap model) throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(roleManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(roleManageVO.getPageUnit());
		paginationInfo.setPageSize(roleManageVO.getPageSize());

		roleManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		roleManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		roleManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// JPA Service
		List<RoleManageDto> dtoList = roleManageService.selectRoleList(roleManageVO);
		roleManageVO.setRoleManageList(SecurityAdapter.toRoleVOList(dtoList));
		model.addAttribute("roleList", roleManageVO.getRoleManageList());

		int totCnt = roleManageService.selectRoleListTotCnt(roleManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sec/rmt/EgovRoleManage";
	}

	/**
	 * ????? ??
	 * 
	 * @param roleCode       String
	 * @param roleManageVO   RoleManageVO
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/rmt/EgovRole.do")
	public String selectRole(@RequestParam("roleCode") String roleCode,
			@ModelAttribute("roleManageVO") RoleManageVO roleManageVO,
			@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO,
			ModelMap model) throws Exception {

		roleManageVO.setRoleCode(roleCode);

		// Author list for role mapping (Optional feature check)
		// authorManageVO.setAuthorManageList(egovAuthorManageService.selectAuthorAllList(authorManageVO));
		// JPA currently doesn't implement selectAuthorAllList directly, assuming logic
		// handles it or not needed for detail view yet

		LOGGER.debug("[DEBUG] selectRole roleCode: {}", roleCode);
		RoleManageDto dto = roleManageService.selectRole(roleCode);
		if (dto == null) {
			LOGGER.debug("[DEBUG] Role not found for roleCode: {}", roleCode);
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.select"));
			return "forward:/sec/rmt/EgovRoleList.do";
		}
		model.addAttribute("roleManage", SecurityAdapter.toVO(dto));
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM029"));

		return "egovframework/com/sec/rmt/EgovRoleUpdate";
	}

	/**
	 * ??? ???
	 * 
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping("/sec/rmt/EgovRoleInsertView.do")
	public String insertRoleView(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO,
			@ModelAttribute("roleManage") RoleManage roleManage,
			ModelMap model) throws Exception {

		// JPA: Author list retrieval needs ComDefaultVO
		// List<AuthorManageDto> authorList = authorManageService.selectAuthorList(new
		// ComDefaultVO());
		// model.addAttribute("authorManageList",
		// SecurityAdapter.toAuthorVOList(authorList));

		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM029"));

		return "egovframework/com/sec/rmt/EgovRoleInsert";
	}

	/**
	 * ?? ?
	 * 
	 * @param comDefaultCodeVO ComDefaultCodeVO
	 * @param codeId           String
	 * @return List
	 * @exception Exception
	 **/
	public List<CmmnDetailCode> getCmmCodeDetailList(ComDefaultCodeVO comDefaultCodeVO, String codeId)
			throws Exception {
		comDefaultCodeVO.setCodeId(codeId);
		return egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}

	/**
	 * ???????? ?? ?????, ??, ?????????
	 * 
	 * @param roleManage   RoleManage
	 * @param roleManageVO RoleManageVO
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/rmt/EgovRoleInsert.do")
	public String insertRole(@Valid @ModelAttribute("roleManage") RoleManage roleManage,
			@ModelAttribute("roleManageVO") RoleManageVO roleManageVO,
			BindingResult bindingResult,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/rmt/EgovRoleInsert";
		} else {
			String roleTyp = roleManage.getRoleTyp();
			if ("method".equals(roleTyp)) { // KISA ?? ??(2018-10-29, ????
				roleTyp = "mtd";
			} else if ("pointcut".equals(roleTyp)) { // KISA ?? ??(2018-10-29, ????
				roleTyp = "pct";
			} else { // KISA ?? ??(2018-10-29, ????
				roleTyp = "web";
			}

			roleManage.setRoleCode(roleTyp.concat("-").concat(egovRoleIdGnrService.getNextStringId()));
			roleManageVO.setRoleCode(roleManage.getRoleCode());

			model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM029"));

			// JPA Insert
			// RoleManageDto dto = SecurityAdapter.toDto(roleManageVO); // roleManage
			// inherits from VO effectively or share
			// fields
			// Assuming RoleManage fields need to be mapped if not VO compatible directly.
			// Since RoleManageVO extends RoleManage, we can use SecurityAdapter with
			// mapping logic.
			// But SecurityAdapter takes VO. Let's construct DTO from roleManage fields
			// manually or careful cast.

			RoleManageDto insertDto = RoleManageDto.builder()
					.roleCode(roleManage.getRoleCode())
					.roleNm(roleManage.getRoleNm())
					.rolePttrn(roleManage.getRolePtn())
					.roleDc(roleManage.getRoleDc())
					.roleTy(roleManage.getRoleTyp())
					.roleSort(roleManage.getRoleSort())
					.build();

			roleManageService.insertRole(insertDto);

			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			// Return DTO or something? Legacy returned VO/Object. Just redirect.
			return "forward:/sec/rmt/EgovRoleList.do";
		}
	}

	/**
	 * ???????? ?? ?????, ??, ??????????
	 * 
	 * @param roleManage    RoleManage
	 * @param bindingResult BindingResult
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/rmt/EgovRoleUpdate.do")
	public String updateRole(@Valid @ModelAttribute("roleManage") RoleManage roleManage,
			BindingResult bindingResult,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/rmt/EgovRoleUpdate";
		} else {
			RoleManageDto updateDto = RoleManageDto.builder()
					.roleCode(roleManage.getRoleCode())
					.roleNm(roleManage.getRoleNm())
					.rolePttrn(roleManage.getRolePtn())
					.roleDc(roleManage.getRoleDc())
					.roleTy(roleManage.getRoleTyp())
					.roleSort(roleManage.getRoleSort())
					.build();
			roleManageService.updateRole(updateDto);

			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
			return "forward:/sec/rmt/EgovRoleList.do";
		}
	}

	/**
	 * ?????? ?????? ?????? ????
	 * 
	 * @param roleManage RoleManage
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/rmt/EgovRoleDelete.do")
	public String deleteRole(@ModelAttribute("roleManage") RoleManage roleManage,
			ModelMap model) throws Exception {
		roleManageService.deleteRole(roleManage.getRoleCode());
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/rmt/EgovRoleList.do";

	}

	/**
	 * ???? ???????? ?????? ????
	 * 
	 * @param roleCodes  String
	 * @param roleManage RoleManage
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/sec/rmt/EgovRoleListDelete.do")
	public String deleteRoleList(@RequestParam("roleCodes") String roleCodes,
			@ModelAttribute("roleManage") RoleManage roleManage,
			Model model) throws Exception {
		String[] strRoleCodes = roleCodes.split(";");
		roleManageService.deleteRoles(strRoleCodes);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/rmt/EgovRoleList.do";
	}

}
