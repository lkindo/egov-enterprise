package egovframework.com.uss.ion.ntr.web;

import java.util.List;
import java.util.Map;

import jakarta.annotation.Resource;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.uss.ion.ntr.service.EgovNoteRecptnService;
import egovframework.com.uss.ion.ntr.service.NoteRecptn;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;

@Controller
public class EgovNoteRecptnController {

    @Resource(name = "egovNoteRecptnService")
    private EgovNoteRecptnService egovNoteRecptnService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 받은쪽지함관리 목록을 조회한다.
     * 
     * @param searchVO
     * @param model
     * @return "egovframework/com/uss/ion/ntr/EgovNoteRecptnList"
     * @throws Exception
     */
    @IncludedInfo(name = "받은쪽지함관리", listUrl = "/uss/ion/ntr/listNoteRecptn.do", order = 720, gid = 50)
    @RequestMapping(value = "/uss/ion/ntr/listNoteRecptn.do")
    public String selectNoteRecptnList(@ModelAttribute("searchVO") NoteRecptn searchVO, ModelMap model)
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

        List<EgovMap> resultList = egovNoteRecptnService.selectNoteRecptnList(searchVO);
        model.addAttribute("resultList", resultList);

        int totCnt = egovNoteRecptnService.selectNoteRecptnListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/uss/ion/ntr/EgovNoteRecptnList";
    }

    /**
     * 받은쪽지함관리를 상세조회한다.
     * 
     * @param searchVO
     * @param model
     * @return "egovframework/com/uss/ion/ntr/EgovNoteRecptnDetail"
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/ntr/detailNoteRecptn.do")
    public String selectNoteRecptnDetail(@ModelAttribute("searchVO") NoteRecptn searchVO, ModelMap model)
            throws Exception {

        Map<?, ?> noteRecptn = egovNoteRecptnService.selectNoteRecptnDetail(searchVO);
        model.addAttribute("noteRecptn", noteRecptn);

        return "egovframework/com/uss/ion/ntr/EgovNoteRecptnDetail";
    }

    /**
     * 받은쪽지함관리를 삭제한다.
     * 
     * @param searchVO
     * @param model
     * @return "forward:/uss/ion/ntr/listNoteRecptn.do"
     * @throws Exception
     */
    @RequestMapping(value = "/uss/ion/ntr/deleteNoteRecptn.do")
    public String deleteNoteRecptn(@ModelAttribute("searchVO") NoteRecptn searchVO, ModelMap model) throws Exception {

        egovNoteRecptnService.deleteNoteRecptn(searchVO);

        return "forward:/uss/ion/ntr/listNoteRecptn.do";
    }

}
