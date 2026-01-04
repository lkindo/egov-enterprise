package egovframework.com.cop.cmy.web;

import java.util.stream.Collectors; // Wait, actually List might be used in legacy but replaced. Map is unused. 
// Lint said "List is never used" and "Map is never used".
// Checking code: model.addAttribute("resultList", pageResult.getContent().stream().map(CommunityAdapter::toVO).toList());
// toList() creates a List. But the import is java.util.List.
// If I use List in code, I must import it.
// Maybe it's complaining because it's only used as fully qualified name or inferred?
// No, resultList attribute value is a List.
// Ah, `toList()` returns a List, but I don't reference the List type explicitly in variable declaration if I pass it directly.
// So yes, I can remove it if I don't use `List<...>` syntax explicitly.

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.support.SessionStatus;

import com.company.project.service.community.EgovCommunityService;
import com.company.project.service.community.dto.CommunityDto;
import com.company.project.web.adapter.CommunityAdapter;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.cmy.service.Community;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 커뮤니티 정보 관리를 위한 컨트롤러 클래스
 * Refactored to use EgovCommunityService (JPA)
 */
@Controller
public class EgovCommuMasterController {

    @Resource(name = "egovCommunityService")
    private EgovCommunityService egovCommunityService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    @RequestMapping("/cop/cmy/selectCommuMasterList.do")
    public String selectCommuMasterList(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model)
            throws Exception {

        cmmntyVO.setPageUnit(propertyService.getInt("pageUnit"));
        cmmntyVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(cmmntyVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(cmmntyVO.getPageUnit());
        paginationInfo.setPageSize(cmmntyVO.getPageSize());

        cmmntyVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        cmmntyVO.setLastIndex(paginationInfo.getLastRecordIndex());
        cmmntyVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        PageRequest pageable = PageRequest.of(paginationInfo.getCurrentPageNo() - 1,
                paginationInfo.getRecordCountPerPage());
        Page<CommunityDto> pageResult = egovCommunityService.getCommunityList(cmmntyVO.getSearchWrd(), pageable);

        model.addAttribute("resultList", pageResult.getContent().stream().map(CommunityAdapter::toVO).toList());
        model.addAttribute("resultCnt", pageResult.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/cop/cmy/EgovCommuMasterList";
    }

    @RequestMapping("/cop/cmy/insertCommuMasterView.do")
    public String insertCommuMasterView(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model)
            throws Exception {
        model.addAttribute("cmmntyVO", new CommunityVO());
        return "egovframework/com/cop/cmy/EgovCommuMasterRegist";
    }

    @RequestMapping("/cop/cmy/insertCommuMaster.do")
    public String insertCommuMaster(@ModelAttribute("searchVO") CommunityVO cmmntyVO,
            @ModelAttribute("cmmntyVO") Community cmmnty,
            BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            return "egovframework/com/cop/cmy/EgovCommuMasterRegist";
        }

        String userId = user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId());

        CommunityDto dto = CommunityAdapter.toDto(cmmnty);
        egovCommunityService.createCommunity(userId, dto);

        return "forward:/cop/cmy/selectCommuMasterList.do";
    }

    @RequestMapping("/cop/cmy/selectCommuMasterDetail.do")
    public String selectCommuMasterDetail(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model)
            throws Exception {

        CommunityDto dto = egovCommunityService.getCommunity(cmmntyVO.getCmmntyId());
        model.addAttribute("cmmntyVO", CommunityAdapter.toVO(dto));

        return "egovframework/com/cop/cmy/EgovCommuMasterDetail";
    }

    @RequestMapping("/cop/cmy/updateCommuMasterView.do")
    public String updateCommuMasterView(@ModelAttribute("searchVO") CommunityVO cmmntyVO, ModelMap model)
            throws Exception {

        CommunityDto dto = egovCommunityService.getCommunity(cmmntyVO.getCmmntyId());
        model.addAttribute("cmmntyVO", CommunityAdapter.toVO(dto));

        return "egovframework/com/cop/cmy/EgovCommuMasterUpdt";
    }

    @RequestMapping("/cop/cmy/updateCommuMaster.do")
    public String updateCommuMaster(@ModelAttribute("searchVO") CommunityVO cmmntyVO,
            @ModelAttribute("cmmntyVO") Community cmmnty,
            BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        if (bindingResult.hasErrors()) {
            return "egovframework/com/cop/cmy/EgovCommuMasterUpdt";
        }

        String userId = user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId());

        CommunityDto dto = CommunityAdapter.toDto(cmmnty);
        egovCommunityService.updateCommunity(cmmnty.getCmmntyId(), userId, dto);

        return "forward:/cop/cmy/selectCommuMasterList.do";
    }
}
