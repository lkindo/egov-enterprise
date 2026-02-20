package egovframework.com.sec.drm.web;

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
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.web.EgovComAbstractController;
import egovframework.com.sec.drm.service.DeptAuthor;
import egovframework.com.sec.drm.service.DeptAuthorVO;
import egovframework.com.sec.drm.service.EgovDeptAuthorService;
import egovframework.com.sec.ram.service.AuthorManageVO;
import egovframework.com.sec.ram.service.EgovAuthorManageService;
import jakarta.annotation.Resource;

/**
 * Dept Author Controller
 **/
@Controller
@SessionAttributes(types = SessionVO.class)
public class EgovDeptAuthorController extends EgovComAbstractController {

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "egovDeptAuthorService")
    private EgovDeptAuthorService egovDeptAuthorService;

    @Resource(name = "egovAuthorManageService")
    private EgovAuthorManageService egovAuthorManageService;

    /** EgovPropertyService **/
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @RequestMapping("/sec/drm/EgovDeptAuthorListView.do")
    public String selectDeptAuthorListView() throws Exception {
        return "egovframework/com/sec/drm/EgovDeptAuthorManage";
    }

    @IncludedInfo(name = "Legacy Controller", listUrl = "/sec/drm/EgovDeptAuthorList.do", order = 100, gid = 20)
    @RequestMapping(value = "/sec/drm/EgovDeptAuthorList.do")
    public String selectDeptAuthorList(@ModelAttribute("deptAuthorVO") DeptAuthorVO deptAuthorVO,
            @ModelAttribute("authorManageVO") AuthorManageVO authorManageVO,
            ModelMap model) throws Exception {

        PaginationInfo paginationInfo = builderPaginationInfo(deptAuthorVO);

        deptAuthorVO.setDeptAuthorList(egovDeptAuthorService.selectDeptAuthorList(deptAuthorVO));
        model.addAttribute("deptAuthorList", deptAuthorVO.getDeptAuthorList());

        int totCnt = egovDeptAuthorService.selectDeptAuthorListTotCnt(deptAuthorVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        authorManageVO.setAuthorManageList(egovAuthorManageService.selectAuthorAllList(authorManageVO));
        model.addAttribute("authorManageList", authorManageVO.getAuthorManageList());

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/sec/drm/EgovDeptAuthorManage";
    }

    @RequestMapping(value = "/sec/drm/EgovDeptAuthorInsert.do")
    public String insertDeptAuthor(@RequestParam("userIds") String userIds,
            @RequestParam("authorCodes") String authorCodes,
            @RequestParam("regYns") String regYns,
            @ModelAttribute("deptAuthor") DeptAuthor deptAuthor,
            ModelMap model) throws Exception {

        String[] strUserIds = userIds.split(";");
        String[] strAuthorCodes = authorCodes.split(";");
        String[] strRegYns = regYns.split(";");

        for (int i = 0; i < strUserIds.length; i++) {
            deptAuthor.setUniqId(strUserIds[i]);
            deptAuthor.setAuthorCode(strAuthorCodes[i]);
            if (strRegYns[i].equals("N")) {
                egovDeptAuthorService.insertDeptAuthor(deptAuthor);
            } else {
                egovDeptAuthorService.updateDeptAuthor(deptAuthor);
            }
        }

        model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
        return "forward:/sec/drm/EgovDeptAuthorList.do";
    }

    @RequestMapping(value = "/sec/drm/EgovDeptAuthorDelete.do")
    public String deleteDeptAuthor(@RequestParam("userIds") String userIds,
            @ModelAttribute("deptAuthor") DeptAuthor deptAuthor,
            ModelMap model) throws Exception {

        String[] strUserIds = userIds.split(";");
        for (String strUserId : strUserIds) {
            deptAuthor.setUniqId(strUserId);
            egovDeptAuthorService.deleteDeptAuthor(deptAuthor);
        }

        model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
        return "forward:/sec/drm/EgovDeptAuthorList.do";
    }

    @RequestMapping("/sec/drm/EgovDeptSearchView.do")
    public String selectDeptListView() throws Exception {
        return "egovframework/com/sec/drm/EgovDeptSearch";
    }

    //@IncludedInfo(name = "Legacy Controller", order = 101)
    @RequestMapping(value = "/sec/drm/EgovDeptSearchList.do")
    public String selectDeptList(@ModelAttribute("deptAuthorVO") DeptAuthorVO deptAuthorVO,
            ModelMap model) throws Exception {

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(deptAuthorVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(deptAuthorVO.getPageUnit());
        paginationInfo.setPageSize(deptAuthorVO.getPageSize());

        deptAuthorVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        deptAuthorVO.setLastIndex(paginationInfo.getLastRecordIndex());
        deptAuthorVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        deptAuthorVO.setDeptList(egovDeptAuthorService.selectDeptList(deptAuthorVO));
        model.addAttribute("deptList", deptAuthorVO.getDeptList());

        int totCnt = egovDeptAuthorService.selectDeptListTotCnt(deptAuthorVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/sec/drm/EgovDeptSearch";
    }

    // Helper method for pagination info to keep code clean and matching original relative logic
    private PaginationInfo builderPaginationInfo(DeptAuthorVO deptAuthorVO) {
        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(deptAuthorVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(deptAuthorVO.getPageUnit());
        paginationInfo.setPageSize(deptAuthorVO.getPageSize());

        deptAuthorVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        deptAuthorVO.setLastIndex(paginationInfo.getLastRecordIndex());
        deptAuthorVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
        return paginationInfo;
    }
}
