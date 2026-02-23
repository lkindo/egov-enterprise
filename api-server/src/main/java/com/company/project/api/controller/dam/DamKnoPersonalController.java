package com.company.project.api.controller.dam;

import com.company.project.domain.dam.KnowledgeInf;

import com.company.project.service.dam.EgovKnoPersonalService;

import com.company.project.service.dam.EgovMapKnoService;

import com.company.project.service.dam.EgovMapTeamService;

import com.company.project.service.dam.dto.KnowledgeDto;

import com.company.project.service.dam.dto.MapKnoDto;

import com.company.project.service.dam.dto.MapTeamDto;

import com.company.project.security.service.CustomUserDetails;
import com.company.project.service.file.EgovFileService;
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

import org.springframework.web.multipart.MultipartFile;

import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.util.List;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@RequestMapping("/dam/per")
public class DamKnoPersonalController {

    private final EgovKnoPersonalService knoPersonalService;
    private final EgovMapTeamService mapTeamService;
    private final EgovMapKnoService mapKnoService;
    private final EgovFileService fileService;
    private final EgovPropertyService propertiesService;

    @RequestMapping(value = "/EgovComDamPersonalList.do")

    public String selectKnoPersonalList(

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

        Page<KnowledgeInf> page = knoPersonalService.selectKnoPersonalList(
                searchCondition, searchKeyword, uniqId, PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());

        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/dam/per/EgovComDamPersonalList";

    }

    @RequestMapping(value = "/EgovComDamPersonal.do")

    public String selectKnoPersonal(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {

        KnowledgeDto result = knoPersonalService.selectKnoPersonalDetail(knoId);

        model.addAttribute("result", result);

        return "egovframework/com/dam/per/EgovComDamPersonalDetail";

    }

    @GetMapping(value = "/EgovComDamPersonalRegistView.do")

    public String insertKnoPersonalView(ModelMap model) throws Exception {

        List<MapTeamDto> mapTeamList = mapTeamService.selectMapTeamList(null, null, PageRequest.of(0, 999))

                .getContent();

        model.addAttribute("mapTeamList", mapTeamList);

        List<MapKnoDto> mapMaterialList = mapKnoService.selectMapKnoList(null, null, PageRequest.of(0, 999))

                .getContent().stream()

                .map(res -> {

                    MapKnoDto dto = new MapKnoDto();

                    dto.setKnoTypeCd(res.getKnoTypeCd());

                    dto.setKnoTypeNm(res.getKnoTypeNm());

                    return dto;

                }).toList();

        model.addAttribute("mapMaterialList", mapMaterialList);

        model.addAttribute("knowledgeDto", new KnowledgeDto());

        return "egovframework/com/dam/per/EgovComDamPersonalRegist";

    }

    @PostMapping(value = "/EgovComDamPersonalRegist.do")

    public String insertKnoPersonal(final MultipartHttpServletRequest multiRequest,

            @Valid @ModelAttribute("knowledgeDto") KnowledgeDto knowledgeDto,

            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/per/EgovComDamPersonalRegist";

        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();

        List<MultipartFile> files = multiRequest.getFiles("file_1");

        String atchFileId = "";
        if (!files.isEmpty()) {
            atchFileId = fileService.uploadFiles(files);
        }

        knowledgeDto.setAtchFileId(atchFileId);

        knowledgeDto.setFrstRegisterId(userDetails.getUser().getEsntlId());

        knoPersonalService.insertKnoPersonal(knowledgeDto);

        return "forward:/dam/per/EgovComDamPersonalList.do";

    }

    @GetMapping(value = "/EgovComDamPersonalModifyView.do")

    public String updateKnoPersonalView(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {

        KnowledgeDto result = knoPersonalService.selectKnoPersonalDetail(knoId);

        model.addAttribute("knowledgeDto", result);

        return "egovframework/com/dam/per/EgovComDamPersonalModify";

    }

    @PostMapping(value = "/EgovComDamPersonalModify.do")

    public String updateKnoPersonal(final MultipartHttpServletRequest multiRequest,

            @RequestParam Map<String, String> commandMap,

            @Valid @ModelAttribute("knowledgeDto") KnowledgeDto knowledgeDto,

            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/per/EgovComDamPersonalModify";

        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();

        knowledgeDto.setLastUpdusrId(userDetails.getUser().getEsntlId());

        String atchFileId = knowledgeDto.getAtchFileId();

        List<MultipartFile> files = multiRequest.getFiles("file_1");

        if (!files.isEmpty()) {

            String atchFileAt = commandMap.get("atchFileAt");

            if ("N".equals(atchFileAt)) {
                atchFileId = fileService.uploadFiles(files);
                knowledgeDto.setAtchFileId(atchFileId);
            } else {
                fileService.updateFiles(atchFileId, files);
            }
        }

        knoPersonalService.updateKnoPersonal(knowledgeDto);

        return "forward:/dam/per/EgovComDamPersonalList.do";

    }

    @PostMapping(value = "/EgovComDamPersonalRemove.do")

    public String deleteKnoPersonal(@RequestParam("knoId") String knoId) throws Exception {

        knoPersonalService.deleteKnoPersonal(knoId);

        return "forward:/dam/per/EgovComDamPersonalList.do";

    }

}

