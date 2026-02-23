package com.company.project.api.controller.dam;

import com.company.project.domain.dam.MapKnoSearchResult;
import com.company.project.service.dam.EgovMapKnoService;
import com.company.project.service.dam.EgovMapTeamService;
import com.company.project.service.dam.dto.MapKnoDto;
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
import java.util.List;

/**
 * 지식유형 관리를 위한 컨트롤러 클래스
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/dam/map/mat")
public class DamMapKnoController {

    private final EgovMapKnoService mapKnoService;
    private final EgovMapTeamService mapTeamService;
    private final EgovPropertyService propertiesService;

    /**
     * 지식유형 목록을 조회한다.
     */
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

    /**
     * 지식유형 상세 정보를 조회한다.
     */
    @RequestMapping(value = "/EgovComDamMapMaterial.do")
    public String selectMapKno(@RequestParam("knoTypeCd") String knoTypeCd, ModelMap model) throws Exception {
        MapKnoDto result = mapKnoService.selectMapKnoDetail(knoTypeCd);
        model.addAttribute("result", result);
        return "egovframework/com/dam/map/mat/EgovComDamMapMaterialDetail";
    }

    /**
     * 지식유형 등록 화면으로 이동한다.
     */
    @GetMapping(value = "/EgovComDamMapMaterialRegist.do")
    public String insertMapKnoView(ModelMap model) throws Exception {
        List<MapTeamDto> mapTeamList = mapTeamService.selectMapTeamList(null, null, PageRequest.of(0, 999))
                .getContent();
        model.addAttribute("mapTeam", mapTeamList);
        model.addAttribute("mapKnoDto", new MapKnoDto());

        return "egovframework/com/dam/map/mat/EgovComDamMapMaterialRegist";
    }

    /**
     * 지식유형 정보를 등록한다.
     */
    @PostMapping(value = "/EgovComDamMapMaterialRegist.do")
    public String insertMapKno(@Valid @ModelAttribute("mapKnoDto") MapKnoDto mapKnoDto, BindingResult bindingResult,
            ModelMap model) throws Exception {
        if (bindingResult.hasErrors()) {
            List<MapTeamDto> mapTeamList = mapTeamService.selectMapTeamList(null, null, PageRequest.of(0, 999))
                    .getContent();
            model.addAttribute("mapTeam", mapTeamList);
            return "egovframework/com/dam/map/mat/EgovComDamMapMaterialRegist";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = (auth == null) ? "GUEST" : auth.getName();
        mapKnoDto.setFrstRegisterId(userId);

        mapKnoService.insertMapKno(mapKnoDto);
        return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";
    }

    /**
     * 지식유형 수정 화면으로 이동한다.
     */
    @GetMapping(value = "/EgovComDamMapMaterialModify.do")
    public String updateMapKnoView(@RequestParam("knoTypeCd") String knoTypeCd, ModelMap model) throws Exception {
        MapKnoDto result = mapKnoService.selectMapKnoDetail(knoTypeCd);
        model.addAttribute("mapKnoDto", result);
        return "egovframework/com/dam/map/mat/EgovComDamMapMaterialModify";
    }

    /**
     * 지식유형 정보를 수정한다.
     */
    @PostMapping(value = "/EgovComDamMapMaterialModify.do")
    public String updateMapKno(@Valid @ModelAttribute("mapKnoDto") MapKnoDto mapKnoDto, BindingResult bindingResult) throws Exception {
        if (bindingResult.hasErrors()) {
            return "egovframework/com/dam/map/mat/EgovComDamMapMaterialModify";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = (auth == null) ? "GUEST" : auth.getName();
        mapKnoDto.setFrstRegisterId(userId);

        mapKnoService.updateMapKno(mapKnoDto);
        return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";
    }

    /**
     * 지식유형 정보를 삭제한다.
     */
    @RequestMapping(value = "/EgovComDamMapMaterialRemove.do")
    public String deleteMapKno(@RequestParam("knoTypeCd") String knoTypeCd) throws Exception {
        mapKnoService.deleteMapKno(knoTypeCd);
        return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";
    }
}
