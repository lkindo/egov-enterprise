package com.company.project.api.controller.program;

import com.company.project.service.program.ProgramService;
import com.company.project.service.program.dto.ProgramDto;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.validation.Valid;

@Controller
@RequiredArgsConstructor
public class ProgramController {

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    private final ProgramService programService;

    /**
     * 프로그램목록 리스트조회
     */
    @GetMapping(value = { "/sym/prm/EgovProgramListManageSelect.do", "/sym/prm/EgovProgramListManage.do" })
    public String selectProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model) throws Exception {

        // Pagination logic
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        model.addAttribute("list_progrmmanage", programService.selectProgrmList(searchVO));
        model.addAttribute("searchVO", searchVO);

        int totCnt = programService.selectProgrmListTotCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "sym/prm/EgovProgramListManage";
    }

    /**
     * 프로그램상세조회
     */
    @RequestMapping(value = "/sym/prm/EgovProgramListDetailSelect.do")
    public String selectProgrm(@RequestParam("tmp_progrmNm") String tmp_progrmNm,
            @ModelAttribute("searchVO") ComDefaultVO searchVO, Model model) throws Exception {
        searchVO.setSearchKeyword(tmp_progrmNm);
        // Using Entity directly as VO for simplicity in migration
        ProgramDto progrmManageVO = programService.selectProgrmById(tmp_progrmNm);
        model.addAttribute("progrmManageVO", progrmManageVO);
        return "sym/prm/EgovProgramListDetailSelectUpdt";
    }

    /**
     * 프로그램등록 화면
     */
    @GetMapping(value = "/sym/prm/EgovProgramListRegist.do")
    public String insertProgrmListView(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)
            throws Exception {
        model.addAttribute("progrmManageVO", new ProgramDto());
        return "sym/prm/EgovProgramListRegist";
    }

    /**
     * 프로그램등록 처리
     */
    @PostMapping(value = "/sym/prm/EgovProgramListRegist.do")
    public String insertProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
            @ModelAttribute("progrmManageVO") ProgramDto progrmManageVO,
            BindingResult bindingResult, Model model,
            RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {
            return "sym/prm/EgovProgramListRegist";
        }

        if (progrmManageVO.getProgrmDc() == null || progrmManageVO.getProgrmDc().equals("")) {
            progrmManageVO.setProgrmDc(" ");
        }

        programService.insertProgrm(progrmManageVO);
        String resultMsg = egovMessageSource.getMessage("success.common.insert");
        redirectAttributes.addAttribute("resultMsg", resultMsg);
        return "redirect:/sym/prm/EgovProgramListManageSelect.do";
    }

    /**
     * 프로그램수정 처리
     */
    @PostMapping(value = "/sym/prm/EgovProgramListDetailSelectUpdt.do")
    public String updateProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
            @ModelAttribute("progrmManageVO") ProgramDto progrmManageVO,
            BindingResult bindingResult, Model model,
            RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {
            return "sym/prm/EgovProgramListDetailSelectUpdt";
        }

        programService.updateProgrm(progrmManageVO);
        String resultMsg = egovMessageSource.getMessage("success.common.update");
        redirectAttributes.addAttribute("resultMsg", resultMsg);
        return "redirect:/sym/prm/EgovProgramListManageSelect.do";
    }

    /**
     * 프로그램삭제 처리
     */
    @PostMapping(value = "/sym/prm/EgovProgramListManageDelete.do")
    public String deleteProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO,
            @ModelAttribute("progrmManageVO") ProgramDto progrmManageVO,
            Model model, RedirectAttributes redirectAttributes) throws Exception {
        programService.deleteProgrm(progrmManageVO);
        String resultMsg = egovMessageSource.getMessage("success.common.delete");
        redirectAttributes.addAttribute("resultMsg", resultMsg);
        return "redirect:/sym/prm/EgovProgramListManageSelect.do";
    }

    /**
     * 프로그램목록 멀티 삭제
     */
    @PostMapping("/sym/prm/EgovProgrmManageListDelete.do")
    public String deleteProgrmManageList(@RequestParam("checkedProgrmFileNmForDel") String checkedProgrmFileNmForDel,
            @ModelAttribute("searchVO") ComDefaultVO searchVO,
            Model model,
            RedirectAttributes redirectAttributes) throws Exception {

        programService.deleteProgrmManageList(checkedProgrmFileNmForDel);
        String resultMsg = egovMessageSource.getMessage("success.common.delete");
        redirectAttributes.addAttribute("resultMsg", resultMsg);
        return "redirect:/sym/prm/EgovProgramListManageSelect.do";
    }

    /**
     * 프로그램파일명을 조회한다. (팝업)
     */
    @RequestMapping(value = "/sym/prm/EgovProgramListSearch.do")
    public String selectProgrmListSearch(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)
            throws Exception {
        // Pagination
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        model.addAttribute("list_progrmmanage", programService.selectProgrmList(searchVO));
        model.addAttribute("paginationInfo", paginationInfo);

        return "sym/prm/EgovFileNmSearch";
    }

}
