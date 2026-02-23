package com.company.project.api.controller.dam;

import com.company.project.domain.dam.KnowledgeInfSearchResult;

import com.company.project.service.dam.EgovKnoAppraisalService;

import com.company.project.service.dam.dto.KnowledgeDto;

import com.company.project.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

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
@RequiredArgsConstructor
@RequestMapping("/dam/app")
public class DamKnoAppraisalController {

    private final EgovKnoAppraisalService knoAppraisalService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    @RequestMapping(value = "/EgovComDamAppraisalList.do")

    public String selectKnoAppraisalList(

            @RequestParam(value = "searchCondition", required = false) String searchCondition,

            @RequestParam(value = "searchKeyword", required = false) String searchKeyword,

            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,

            ModelMap model) throws Exception {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        String uniqId = userDetails.getUser().getEsntlId();

        int pageUnit = propertiesService.getInt("pageUnit");

        int pageSize = propertiesService.getInt("pageSize");

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(pageIndex);

        paginationInfo.setRecordCountPerPage(pageUnit);

        paginationInfo.setPageSize(pageSize);

        Page<KnowledgeInfSearchResult> page = knoAppraisalService.selectKnoAppraisalList(
                uniqId, searchCondition, searchKeyword, PageRequest.of(pageIndex - 1, pageUnit));

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

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() instanceof String) {
            model.addAttribute("message", messageSource.getMessage("fail.common.login", null, LocaleContextHolder.getLocale()));
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        knowledgeDto.setLastUpdusrId(userDetails.getUser().getEsntlId());

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/app/EgovComDamAppraisalModify";

        }

        knoAppraisalService.updateKnoAppraisal(knowledgeDto);

        return "forward:/dam/app/EgovComDamAppraisalList.do";

    }

}

