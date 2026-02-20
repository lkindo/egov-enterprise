package com.company.project.api.controller.dam;

import com.company.project.domain.dam.KnowledgeInfSearchResult;

import com.company.project.service.dam.EgovKnoAppraisalService;

import com.company.project.service.dam.dto.KnowledgeDto;

import egovframework.com.cmm.EgovMessageSource;

import egovframework.com.cmm.LoginVO;

import egovframework.com.cmm.annotation.IncludedInfo;

import egovframework.com.cmm.util.EgovUserDetailsHelper;

import jakarta.annotation.Resource;

import jakarta.validation.Valid;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageRequest;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.validation.BindingResult;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.ModelAttribute;

import org.springframework.web.bind.annotation.PostMapping;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

@Controller

@RequestMapping("/dam/app")

public class DamKnoAppraisalController {

    @Resource(name = "egovKnoAppraisalServiceImpl")

    private EgovKnoAppraisalService knoAppraisalService;

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")

    EgovMessageSource egovMessageSource;

    @IncludedInfo(name = "        ??              ?     ??", listUrl = "/dam/app/EgovComDamAppraisalList.do", order = 1290, gid = 80)

    @RequestMapping(value = "/EgovComDamAppraisalList.do")

    public String selectKnoAppraisalList(

            @RequestParam(value = "searchCondition", required = false) String searchCondition,

            @RequestParam(value = "searchKeyword", required = false) String searchKeyword,

            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,

            ModelMap model) throws Exception {

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        int pageUnit = propertiesService.getInt("pageUnit");

        int pageSize = propertiesService.getInt("pageSize");

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(pageIndex);

        paginationInfo.setRecordCountPerPage(pageUnit);

        paginationInfo.setPageSize(pageSize);

        Page<KnowledgeInfSearchResult> page = knoAppraisalService.selectKnoAppraisalList(

                loginVO.getUniqId(), searchCondition, searchKeyword, PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());

        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("searchCondition", searchCondition);

        model.addAttribute("searchKeyword", searchKeyword);

        return "egovframework/com/dam/app/EgovComDamAppraisalList";

    }

    @RequestMapping(value = "/EgovComDamAppraisal.do")

    public String selectKnoAppraisal(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {

        KnowledgeDto result = knoAppraisalService.selectKnoAppraisalDetail(knoId);

        model.addAttribute("result", result);

        return "egovframework/com/dam/app/EgovComDamAppraisalDetail";

    }

    @GetMapping(value = "/EgovComDamAppraisalModify.do")

    public String updateKnoAppraisalView(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {

        KnowledgeDto result = knoAppraisalService.selectKnoAppraisalDetail(knoId);

        model.addAttribute("knowledgeDto", result);

        return "egovframework/com/dam/app/EgovComDamAppraisalModify";

    }

    @PostMapping(value = "/EgovComDamAppraisalModify.do")

    public String updateKnoAppraisal(@Valid @ModelAttribute("knowledgeDto") KnowledgeDto knowledgeDto,

            BindingResult bindingResult, ModelMap model) throws Exception {

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        if (loginVO != null) {

            knowledgeDto.setLastUpdusrId(loginVO.getUniqId());

        }

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/app/EgovComDamAppraisalModify";

        }

        knoAppraisalService.updateKnoAppraisal(knowledgeDto);

        return "forward:/dam/app/EgovComDamAppraisalList.do";

    }

}

