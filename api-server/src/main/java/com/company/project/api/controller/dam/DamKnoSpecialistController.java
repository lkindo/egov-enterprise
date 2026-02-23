package com.company.project.api.controller.dam;

import com.company.project.domain.dam.ProfessionalSearchResult;

import com.company.project.service.dam.EgovKnoSpecialistService;

import com.company.project.service.dam.dto.ProfessionalDto;

import com.company.project.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/dam/spe/spe")
public class DamKnoSpecialistController {

    private final EgovKnoSpecialistService knoSpecialistService;
    private final EgovPropertyService propertiesService;

    @RequestMapping(value = "/EgovComDamSpecialistList.do")

    public String selectKnoSpecialistList(

            @RequestParam(value = "searchCondition", required = false) String searchCondition,

            @RequestParam(value = "searchKeyword", required = false) String searchKeyword,

            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,

            ModelMap model) throws Exception {

        int pageUnit = propertiesService.getInt("pageUnit");

        int pageSize = propertiesService.getInt("pageSize");

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(pageIndex);

        paginationInfo.setRecordCountPerPage(pageUnit);

        paginationInfo.setPageSize(pageSize);

        Page<ProfessionalSearchResult> page = knoSpecialistService.selectKnoSpecialistList(

                searchCondition, searchKeyword, PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());

        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/dam/spe/spe/EgovComDamSpecialistList";

    }

    @RequestMapping(value = "/EgovComDamSpecialist.do")

    public String selectKnoSpecialist(

            @RequestParam("speId") String speId,

            @RequestParam("knoTypeCd") String knoTypeCd,

            @RequestParam("appTypeCd") String appTypeCd,

            ModelMap model) throws Exception {

        ProfessionalDto result = knoSpecialistService.selectKnoSpecialistDetail(speId, knoTypeCd, appTypeCd);

        model.addAttribute("result", result);

        return "egovframework/com/dam/spe/spe/EgovComDamSpecialistDetail";

    }

    @GetMapping(value = "/EgovComDamSpecialistRegist.do")

    public String insertKnoSpecialistView(ModelMap model) throws Exception {

        model.addAttribute("professionalDto", new ProfessionalDto());

        return "egovframework/com/dam/spe/spe/EgovComDamSpecialistRegist";

    }

    @PostMapping(value = "/EgovComDamSpecialistRegist.do")

    public String insertKnoSpecialist(@Valid @ModelAttribute("professionalDto") ProfessionalDto professionalDto,

            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/spe/spe/EgovComDamSpecialistRegist";

        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        professionalDto.setLastUpdusrId(userDetails.getUser().getEsntlId());

        knoSpecialistService.insertKnoSpecialist(professionalDto);

        return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";

    }

    @GetMapping(value = "/EgovComDamSpecialistModify.do")

    public String updateKnoSpecialistView(

            @RequestParam("speId") String speId,

            @RequestParam("knoTypeCd") String knoTypeCd,

            @RequestParam("appTypeCd") String appTypeCd,

            ModelMap model) throws Exception {

        ProfessionalDto result = knoSpecialistService.selectKnoSpecialistDetail(speId, knoTypeCd, appTypeCd);

        model.addAttribute("professionalDto", result);

        return "egovframework/com/dam/spe/spe/EgovComDamSpecialistModify";

    }

    @PostMapping(value = "/EgovComDamSpecialistModify.do")

    public String updateKnoSpecialist(@Valid @ModelAttribute("professionalDto") ProfessionalDto professionalDto,

            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/spe/spe/EgovComDamSpecialistModify";

        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        professionalDto.setLastUpdusrId(userDetails.getUser().getEsntlId());

        knoSpecialistService.updateKnoSpecialist(professionalDto);

        return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";

    }

    @RequestMapping(value = "/EgovComDamSpecialistRemove.do")

    public String deleteKnoSpecialist(

            @RequestParam("speId") String speId,

            @RequestParam("knoTypeCd") String knoTypeCd,

            @RequestParam("appTypeCd") String appTypeCd) throws Exception {

        knoSpecialistService.deleteKnoSpecialist(speId, knoTypeCd, appTypeCd);

        return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";

    }

}

