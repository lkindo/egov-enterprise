package com.company.project.api.controller.dam;

import com.company.project.service.dam.EgovMapTeamService;
import com.company.project.service.dam.dto.MapTeamDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * 지식팀 관리를 위한 컨트롤러 클래스
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/dam/map/tea")
public class DamMapTeamController {

    private final EgovMapTeamService mapTeamService;
    private final EgovPropertyService propertiesService;

    /**
     * 지식팀 목록을 조회한다.
     */
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

    /**
     * 지식팀 상세 정보를 조회한다.
     */
    @RequestMapping(value = "/EgovComDamMapTeam.do")
    public String selectMapTeam(@RequestParam("orgnztId") String orgnztId, ModelMap model) throws Exception {
        MapTeamDto result = mapTeamService.selectMapTeamDetail(orgnztId);
        model.addAttribute("result", result);
        return "egovframework/com/dam/map/tea/EgovComDamMapTeamDetail";
    }

    /**
     * 지식팀 등록 화면으로 이동한다.
     */
    @GetMapping(value = "/EgovComDamMapTeamRegist.do")
    public String insertMapTeamView(ModelMap model) throws Exception {
        model.addAttribute("mapTeamDto", new MapTeamDto());
        return "egovframework/com/dam/map/tea/EgovComDamMapTeamRegist";
    }

    /**
     * 지식팀 정보를 등록한다.
     */
    @PostMapping(value = "/EgovComDamMapTeamRegist.do")
    public String insertMapTeam(@Valid @ModelAttribute("mapTeamDto") MapTeamDto mapTeamDto, BindingResult bindingResult) throws Exception {
        if (bindingResult.hasErrors()) {
            return "egovframework/com/dam/map/tea/EgovComDamMapTeamRegist";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = (auth == null) ? "GUEST" : auth.getName();
        mapTeamDto.setLastUpdusrId(userId);

        mapTeamService.insertMapTeam(mapTeamDto);
        return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
    }

    /**
     * 지식팀 수정 화면으로 이동한다.
     */
    @GetMapping(value = "/EgovComDamMapTeamModify.do")
    public String updateMapTeamView(@RequestParam("orgnztId") String orgnztId, ModelMap model) throws Exception {
        MapTeamDto result = mapTeamService.selectMapTeamDetail(orgnztId);
        model.addAttribute("mapTeamDto", result);
        return "egovframework/com/dam/map/tea/EgovComDamMapTeamModify";
    }

    /**
     * 지식팀 정보를 수정한다.
     */
    @PostMapping(value = "/EgovComDamMapTeamModify.do")
    public String updateMapTeam(@Valid @ModelAttribute("mapTeamDto") MapTeamDto mapTeamDto, BindingResult bindingResult) throws Exception {
        if (bindingResult.hasErrors()) {
            return "egovframework/com/dam/map/tea/EgovComDamMapTeamModify";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = (auth == null) ? "GUEST" : auth.getName();
        mapTeamDto.setLastUpdusrId(userId);

        mapTeamService.updateMapTeam(mapTeamDto);
        return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
    }

    /**
     * 지식팀 정보를 삭제한다.
     */
    @RequestMapping(value = "/EgovComDamMapTeamRemove.do")
    public String deleteMapTeam(@RequestParam("orgnztId") String orgnztId) throws Exception {
        mapTeamService.deleteMapTeam(orgnztId);
        return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
    }
}
