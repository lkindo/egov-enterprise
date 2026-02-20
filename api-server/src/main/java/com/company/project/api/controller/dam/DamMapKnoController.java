package com.company.project.api.controller.dam;

import com.company.project.domain.dam.MapKnoSearchResult;

import com.company.project.service.dam.EgovMapKnoService;

import com.company.project.service.dam.EgovMapTeamService;

import com.company.project.service.dam.dto.MapKnoDto;

import com.company.project.service.dam.dto.MapTeamDto;

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

import java.util.List;

@Controller

@RequestMapping("/dam/map/mat")

public class DamMapKnoController {

    @Resource(name = "egovMapKnoServiceImpl")

    private EgovMapKnoService mapKnoService;

    @Resource(name = "egovMapTeamServiceImpl")

    private EgovMapTeamService mapTeamService;

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertiesService;

    @IncludedInfo(name = "        ??      ?     ???         ", listUrl = "/dam/map/mat/EgovComDamMapMaterialList.do", order = 1260, gid = 80)

    @RequestMapping(value = "/EgovComDamMapMaterialList.do")

    public String selectMapKnoList(

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

        Page<MapKnoSearchResult> page = mapKnoService.selectMapKnoList(

                searchCondition, searchKeyword, PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());

        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/dam/map/mat/EgovComDamMapMaterialList";

    }

    @RequestMapping(value = "/EgovComDamMapMaterial.do")

    public String selectMapKno(@RequestParam("knoTypeCd") String knoTypeCd, ModelMap model) throws Exception {

        MapKnoDto result = mapKnoService.selectMapKnoDetail(knoTypeCd);

        model.addAttribute("result", result);

        return "egovframework/com/dam/map/mat/EgovComDamMapMaterialDetail";

    }

    @GetMapping(value = "/EgovComDamMapMaterialRegist.do")

    public String insertMapKnoView(ModelMap model) throws Exception {

        List<MapTeamDto> mapTeamList = mapTeamService.selectMapTeamList(null, null, PageRequest.of(0, 999))

                .getContent();

        model.addAttribute("mapTeam", mapTeamList);

        model.addAttribute("mapKnoDto", new MapKnoDto());

        return "egovframework/com/dam/map/mat/EgovComDamMapMaterialRegist";

    }

    @PostMapping(value = "/EgovComDamMapMaterialRegist.do")

    public String insertMapKno(@Valid @ModelAttribute("mapKnoDto") MapKnoDto mapKnoDto, BindingResult bindingResult,

            ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            List<MapTeamDto> mapTeamList = mapTeamService.selectMapTeamList(null, null, PageRequest.of(0, 999))

                    .getContent();

            model.addAttribute("mapTeam", mapTeamList);

            return "egovframework/com/dam/map/mat/EgovComDamMapMaterialRegist";

        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        mapKnoDto.setFrstRegisterId(loginVO.getUniqId());

        mapKnoService.insertMapKno(mapKnoDto);

        return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";

    }

    @GetMapping(value = "/EgovComDamMapMaterialModify.do")

    public String updateMapKnoView(@RequestParam("knoTypeCd") String knoTypeCd, ModelMap model) throws Exception {

        MapKnoDto result = mapKnoService.selectMapKnoDetail(knoTypeCd);

        model.addAttribute("mapKnoDto", result);

        return "egovframework/com/dam/map/mat/EgovComDamMapMaterialModify";

    }

    @PostMapping(value = "/EgovComDamMapMaterialModify.do")

    public String updateMapKno(@Valid @ModelAttribute("mapKnoDto") MapKnoDto mapKnoDto, BindingResult bindingResult,

            ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/map/mat/EgovComDamMapMaterialModify";

        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        mapKnoDto.setFrstRegisterId(loginVO.getUniqId());

        mapKnoService.updateMapKno(mapKnoDto);

        return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";

    }

    @RequestMapping(value = "/EgovComDamMapMaterialRemove.do")

    public String deleteMapKno(@RequestParam("knoTypeCd") String knoTypeCd) throws Exception {

        mapKnoService.deleteMapKno(knoTypeCd);

        return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";

    }

}

