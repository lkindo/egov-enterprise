package com.company.project.api.controller.dam;

import com.company.project.service.dam.EgovMapTeamService;
import com.company.project.service.dam.dto.MapTeamDto;
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
@RequestMapping("/dam/map/tea")
public class DamMapTeamController {

    @Resource(name = "egovMapTeamServiceImpl")
    private EgovMapTeamService mapTeamService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    @IncludedInfo(name = "지식맵관리(조직)", listUrl = "/dam/map/tea/EgovComDamMapTeamList.do", order = 1250, gid = 80)
    @RequestMapping(value = "/EgovComDamMapTeamList.do")
    public String selectMapTeamList(
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

        Page<MapTeamDto> page = mapTeamService.selectMapTeamList(
                searchCondition, searchKeyword, PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/dam/map/tea/EgovComDamMapTeamList";
    }

    @RequestMapping(value = "/EgovComDamMapTeam.do")
    public String selectMapTeam(@RequestParam("orgnztId") String orgnztId, ModelMap model) throws Exception {
        MapTeamDto result = mapTeamService.selectMapTeamDetail(orgnztId);
        model.addAttribute("result", result);
        return "egovframework/com/dam/map/tea/EgovComDamMapTeamDetail";
    }

    @GetMapping(value = "/EgovComDamMapTeamRegist.do")
    public String insertMapTeamView(ModelMap model) throws Exception {
        model.addAttribute("mapTeamDto", new MapTeamDto());
        return "egovframework/com/dam/map/tea/EgovComDamMapTeamRegist";
    }

    @PostMapping(value = "/EgovComDamMapTeamRegist.do")
    public String insertMapTeam(@Valid @ModelAttribute("mapTeamDto") MapTeamDto mapTeamDto, BindingResult bindingResult,
            ModelMap model) throws Exception {
        if (bindingResult.hasErrors()) {
            return "egovframework/com/dam/map/tea/EgovComDamMapTeamRegist";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        mapTeamDto.setLastUpdusrId(loginVO.getUniqId());

        mapTeamService.insertMapTeam(mapTeamDto);
        return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
    }

    @GetMapping(value = "/EgovComDamMapTeamModify.do")
    public String updateMapTeamView(@RequestParam("orgnztId") String orgnztId, ModelMap model) throws Exception {
        MapTeamDto result = mapTeamService.selectMapTeamDetail(orgnztId);
        model.addAttribute("mapTeamDto", result);
        return "egovframework/com/dam/map/tea/EgovComDamMapTeamModify";
    }

    @PostMapping(value = "/EgovComDamMapTeamModify.do")
    public String updateMapTeam(@Valid @ModelAttribute("mapTeamDto") MapTeamDto mapTeamDto, BindingResult bindingResult,
            ModelMap model) throws Exception {
        if (bindingResult.hasErrors()) {
            return "egovframework/com/dam/map/tea/EgovComDamMapTeamModify";
        }

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        mapTeamDto.setLastUpdusrId(loginVO.getUniqId());

        mapTeamService.updateMapTeam(mapTeamDto);
        return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
    }

    @RequestMapping(value = "/EgovComDamMapTeamRemove.do")
    public String deleteMapTeam(@RequestParam("orgnztId") String orgnztId) throws Exception {
        mapTeamService.deleteMapTeam(orgnztId);
        return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
    }
}
