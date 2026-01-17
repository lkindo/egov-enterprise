package egovframework.com.uss.ion.nts.web;

import java.util.List;
import java.util.Map;

import jakarta.annotation.Resource;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.uss.ion.nts.service.EgovNoteTrnsmitService;
import egovframework.com.uss.ion.nts.service.NoteTrnsmit;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;

@Controller
public class EgovNoteTrnsmitController {

    @Resource(name = "egovNoteTrnsmitService")
    private EgovNoteTrnsmitService egovNoteTrnsmitService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 보낸쪽지함관리 목록을 조회한다.
     * 
     * @param searchVO
     * @param model
     * @return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitList"
     * @throws Exception
     */
    @IncludedInfo(name = "보낸쪽지함관리", listUrl = "/uss/ion/nts/listNoteTrnsmit.do", order = 730, gid = 50)
    @RequestMapping(value = "/uss/ion/nts/listNoteTrnsmit.do")
    public String selectNoteTrnsmitList(@ModelAttribute("searchVO") NoteTrnsmit searchVO, ModelMap model)
            throws Exception {

        /** EgovPropertyService.sample */
        searchVO.setPageUnit(propertyService.getInt("pageUnit"));
        searchVO.setPageSize(propertyService.getInt("pageSize"));

        /** pageing */
        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<EgovMap> resultList = egovNoteTrnsmitService.selectNoteTrnsmitList(searchVO);
        model.addAttribute("resultList", resultList);

        int totCnt = egovNoteTrnsmitService.selectNoteTrnsmitListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitList";
    }

    /**
     * 보낸쪽지함관리를 상세조회한다.
     * 
     * @param searchVO
     * @param model
     * @return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitDetail"
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/nts/detailNoteTrnsmit.do")
    public String selectNoteTrnsmitDetail(@ModelAttribute("searchVO") NoteTrnsmit searchVO, ModelMap model)
            throws Exception {

        Map<?, ?> noteTrnsmit = egovNoteTrnsmitService.selectNoteTrnsmitDetail(searchVO);
        model.addAttribute("noteTrnsmit", noteTrnsmit);

        // 수신자 목록 조회 (상세화면에서 수신자 확인용)
        List<EgovMap> trnsmitCnfirmList = egovNoteTrnsmitService.selectNoteTrnsmitCnfirm(searchVO);
        model.addAttribute("trnsmitCnfirmList", trnsmitCnfirmList);

        return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitDetail";
    }

    /**
     * 보낸쪽지함관리를 삭제한다.
     * 
     * @param searchVO
     * @param model
     * @return "forward:/uss/ion/nts/listNoteTrnsmit.do"
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/nts/deleteNoteTrnsmit.do")
    public String deleteNoteTrnsmit(@ModelAttribute("searchVO") NoteTrnsmit searchVO, ModelMap model) throws Exception {

        egovNoteTrnsmitService.deleteNoteTrnsmit(searchVO);

        return "forward:/uss/ion/nts/listNoteTrnsmit.do";
    }

    /**
     * 보낸쪽지함 수신확인 목록을 조회한다.
     * 
     * @param searchVO
     * @param model
     * @return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitCnfirmList"
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/nts/listNoteTrnsmitCnfirm.do")
    public String selectNoteTrnsmitCnfirmList(@ModelAttribute("searchVO") NoteTrnsmit searchVO, ModelMap model)
            throws Exception {

        List<EgovMap> resultList = egovNoteTrnsmitService.selectNoteTrnsmitCnfirm(searchVO);
        model.addAttribute("resultList", resultList);

        return "egovframework/com/uss/ion/nts/EgovNoteTrnsmitCnfirmList";
    }
}
