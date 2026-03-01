package egovframework.com.sec.rmt.web;

import java.util.List;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
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
import egovframework.com.sec.ram.service.EgovAuthorManageService;
import egovframework.com.sec.rmt.service.EgovRoleManageService;
import egovframework.com.sec.rmt.service.RoleManage;
import egovframework.com.sec.rmt.service.RoleManageVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 濡ㅺ?由ъ뿉 愿??controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?대Ц以          理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */
@Controller
@SessionAttributes(types=SessionVO.class)
public class EgovRoleManageController {

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "egovRoleManageService")
    private EgovRoleManageService egovRoleManageService;

    @Resource(name = "EgovCmmUseService")
    EgovCmmUseService egovCmmUseService;

    @Resource(name = "egovAuthorManageService")
    private EgovAuthorManageService egovAuthorManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /** Message ID Generation */
    @Resource(name="egovRoleIdGnrService")
    private EgovIdGnrService egovRoleIdGnrService;

    /**
	 * 濡?紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/sec/rmt/EgovRoleListView.do")
    public String selectRoleListView()
            throws Exception {
        return "egovframework/com/sec/rmt/EgovRoleManage";
    }

	/**
	 * ?깅줉??濡??뺣낫 紐⑸줉 議고쉶
	 * @param roleManageVO RoleManageVO
	 * @return String
	 * @exception Exception
	 */
    @IncludedInfo(name="濡ㅺ?由?, listUrl="/sec/rmt/EgovRoleList.do", order = 90,gid = 20)
    @RequestMapping(value="/sec/rmt/EgovRoleList.do")
	public String selectRoleList(@ModelAttribute("roleManageVO") RoleManageVO roleManageVO,
			                      ModelMap model) throws Exception {

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(roleManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(roleManageVO.getPageUnit());
		paginationInfo.setPageSize(roleManageVO.getPageSize());

		roleManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		roleManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		roleManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		roleManageVO.setRoleManageList(egovRoleManageService.selectRoleList(roleManageVO));
        model.addAttribute("roleList", roleManageVO.getRoleManageList());

        int totCnt = egovRoleManageService.selectRoleListTotCnt(roleManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/sec/rmt/EgovRoleManage";
	}

	/**
	 * ?깅줉??濡??뺣낫 議고쉶
	 * @param roleCode String
	 * @param roleManageVO RoleManageVO
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/rmt/EgovRole.do")
	public String selectRole(@RequestParam("roleCode") String roleCode,
	                         @ModelAttribute("roleManageVO") RoleManageVO roleManageVO,
	                         @ModelAttribute("authorManageVO") AuthorManageVO authorManageVO,
		                      ModelMap model) throws Exception {

    	roleManageVO.setRoleCode(roleCode);

    	authorManageVO.setAuthorManageList(egovAuthorManageService.selectAuthorAllList(authorManageVO));

    	model.addAttribute("roleManage", egovRoleManageService.selectRole(roleManageVO));
        model.addAttribute("authorManageList", authorManageVO.getAuthorManageList());
        model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(),"COM029"));

        return "egovframework/com/sec/rmt/EgovRoleUpdate";
	}

    /**
	 * 濡??깅줉?붾㈃ ?대룞
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/sec/rmt/EgovRoleInsertView.do")
    public String insertRoleView(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO,
    								@ModelAttribute("roleManage") RoleManage roleManage,
    									ModelMap model) throws Exception {

    	authorManageVO.setAuthorManageList(egovAuthorManageService.selectAuthorAllList(authorManageVO));
        model.addAttribute("authorManageList", authorManageVO.getAuthorManageList());
        model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(),"COM029"));

        return "egovframework/com/sec/rmt/EgovRoleInsert";
    }

    /**
	 * 怨듯넻肄붾뱶 ?몄텧
	 * @param comDefaultCodeVO ComDefaultCodeVO
	 * @param codeId String
	 * @return List
	 * @exception Exception
	 */
    public List<CmmnDetailCode> getCmmCodeDetailList(ComDefaultCodeVO comDefaultCodeVO, String codeId)  throws Exception {
    	comDefaultCodeVO.setCodeId(codeId);
    	return egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
    }

	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?깅줉
	 * @param roleManage RoleManage
	 * @param roleManageVO RoleManageVO
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/rmt/EgovRoleInsert.do")
	public String insertRole(@Valid @ModelAttribute("roleManage") RoleManage roleManage,
			                 @ModelAttribute("roleManageVO") RoleManageVO roleManageVO,
			                  BindingResult bindingResult,
                              ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/rmt/EgovRoleInsert";
		} else {
    	    String roleTyp = roleManage.getRoleTyp();
	    	if("method".equals(roleTyp)) { //KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				roleTyp = "mtd";
			} else if("pointcut".equals(roleTyp)) { //KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				roleTyp = "pct";
			} else { //KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				roleTyp = "web";
			}

	    	roleManage.setRoleCode(roleTyp.concat("-").concat(egovRoleIdGnrService.getNextStringId()));
	    	roleManageVO.setRoleCode(roleManage.getRoleCode());

	        model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(),"COM029"));
	    	model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
	        model.addAttribute("roleManage", egovRoleManageService.insertRole(roleManage, roleManageVO));

	        //return "egovframework/com/sec/rmt/EgovRoleUpdate";
	        return "forward:/sec/rmt/EgovRoleList.do";
		}
	}

	/**
	 * ?쒖뒪??硫붾돱???곕Ⅸ ?묎렐沅뚰븳, ?곗씠???낅젰, ?섏젙, ??젣??沅뚰븳 濡ㅼ쓣 ?섏젙
	 * @param roleManage RoleManage
	 * @param bindingResult BindingResult
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/rmt/EgovRoleUpdate.do")
	public String updateRole(@Valid @ModelAttribute("roleManage") RoleManage roleManage,
			BindingResult bindingResult,
            ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/rmt/EgovRoleUpdate";
		} else {
    	egovRoleManageService.updateRole(roleManage);
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
    	//return "forward:/sec/rmt/EgovRole.do";
    	return "forward:/sec/rmt/EgovRoleList.do";
		}
	}

	/**
	 * 遺덊븘?뷀븳 濡ㅼ젙蹂대? ?붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param roleManage RoleManage
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/rmt/EgovRoleDelete.do")
	public String deleteRole(@ModelAttribute("roleManage") RoleManage roleManage,
            ModelMap model) throws Exception {
    	egovRoleManageService.deleteRole(roleManage);
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
    	return "forward:/sec/rmt/EgovRoleList.do";

	}

	/**
	 * 遺덊븘?뷀븳 洹몃９?뺣낫 紐⑸줉???붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param roleCodes String
	 * @param roleManage RoleManage
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value="/sec/rmt/EgovRoleListDelete.do")
	public String deleteRoleList(@RequestParam("roleCodes") String roleCodes,
			                     @ModelAttribute("roleManage") RoleManage roleManage,
	                              Model model) throws Exception {
    	String [] strRoleCodes = roleCodes.split(";");
    	for (String strRoleCode : strRoleCodes) {
    		roleManage.setRoleCode(strRoleCode);
    		egovRoleManageService.deleteRole(roleManage);
    	}

		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/rmt/EgovRoleList.do";
	}

}
