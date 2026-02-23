package com.company.project.api.controller.dam;

import com.company.project.domain.dam.KnowledgeRequest;

import com.company.project.service.dam.EgovMapTeamService;

import com.company.project.service.dam.EgovRequestOfferService;

import com.company.project.service.dam.dto.KnowledgeRequestDto;

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
@RequestMapping("/dam/spe/req")
public class DamRequestOfferController {

    private final EgovRequestOfferService requestOfferService;
    private final EgovMapTeamService mapTeamService;
    private final EgovFileService fileService;
    private final EgovPropertyService propertiesService;

    @RequestMapping(value = "/listRequestOffer.do")

    public String selectRequestOfferList(

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

        Page<KnowledgeRequest> page = requestOfferService.selectRequestOfferList(

                searchCondition, searchKeyword, PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());

        model.addAttribute("paginationInfo", paginationInfo);

        if (requestOfferService.isSpecialist(uniqId)) {

            model.addAttribute("IS_SPE", "Y");

        } else {

            model.addAttribute("IS_SPE", "N");

            model.addAttribute("USER_UNIQ_ID", uniqId);

        }

        return "egovframework/com/dam/spe/req/EgovComDamRequestOfferList";

    }

    @RequestMapping(value = "/detailRequestOffer.do")

    public String selectRequestOfferDetail(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {

        KnowledgeRequestDto result = requestOfferService.selectRequestOfferDetail(knoId);

        model.addAttribute("requestOfferVO", result);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        String uniqId = userDetails.getUser().getEsntlId();

        if (requestOfferService.isSpecialist(uniqId)) {

            model.addAttribute("IS_SPE", "Y");

        } else {

            model.addAttribute("IS_SPE", "N");

        }

        model.addAttribute("USER_UNIQ_ID", uniqId);

        return "egovframework/com/dam/spe/req/EgovComDamRequestOfferDetail";

    }

    @GetMapping(value = "/registRequestOffer.do")

    public String insertRequestOfferView(ModelMap model) throws Exception {

        List<MapTeamDto> mapTeamList = mapTeamService.selectMapTeamList(null, null, PageRequest.of(0, 999))

                .getContent();

        model.addAttribute("mapTeamList", mapTeamList);

        model.addAttribute("requestOfferVO", new KnowledgeRequestDto());

        return "egovframework/com/dam/spe/req/EgovComDamRequestOfferRegist";

    }

    @PostMapping(value = "/registRequestOfferActor.do")

    public String insertRequestOffer(final MultipartHttpServletRequest multiRequest,

            @Valid @ModelAttribute("requestOfferVO") KnowledgeRequestDto requestDto,

            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/spe/req/EgovComDamRequestOfferRegist";

        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();

        List<MultipartFile> files = multiRequest.getFiles("file_1");

        String atchFileId = "";
        if (!files.isEmpty()) {
            atchFileId = fileService.uploadFiles(files);
            requestDto.setAtchFileId(atchFileId);
        }

        requestDto.setFrstRegisterId(userDetails.getUser().getEsntlId());

        requestDto.setEmplyrId(userDetails.getUser().getEsntlId());

        requestOfferService.insertRequestOffer(requestDto);

        return "forward:/dam/spe/req/listRequestOffer.do";

    }

    @GetMapping(value = "/updtRequestOffer.do")

    public String updateRequestOfferView(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {

        KnowledgeRequestDto result = requestOfferService.selectRequestOfferDetail(knoId);

        model.addAttribute("requestOfferVO", result);

        return "egovframework/com/dam/spe/req/EgovComDamRequestOfferUpdt";

    }

    @PostMapping(value = "/updtRequestOfferActor.do")

    public String updateRequestOffer(final MultipartHttpServletRequest multiRequest,

            @RequestParam Map<String, String> commandMap,

            @Valid @ModelAttribute("requestOfferVO") KnowledgeRequestDto requestDto,

            BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {

            return "egovframework/com/dam/spe/req/EgovComDamRequestOfferUpdt";

        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();

        requestDto.setLastUpdusrId(userDetails.getUser().getEsntlId());

        String atchFileId = requestDto.getAtchFileId();

        List<MultipartFile> files = multiRequest.getFiles("file_1");

        if (!files.isEmpty()) {

            String atchFileAt = commandMap.get("atchFileAt");

            if ("N".equals(atchFileAt)) {
                atchFileId = fileService.uploadFiles(files);
                requestDto.setAtchFileId(atchFileId);
            } else {
                fileService.updateFiles(atchFileId, files);
            }
        }

        requestOfferService.updateRequestOffer(requestDto);

        return "forward:/dam/spe/req/listRequestOffer.do";

    }

    @RequestMapping(value = "/deleteRequestOffer.do")

    public String deleteRequestOffer(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {

        if (requestOfferService.getReplyCount(knoId) > 0) {

            String resultScript = "<script>alert('??       ??????         ??       ??       ?????????      ??      !'); history.back();</script>";

            model.addAttribute("reusltScript", resultScript);

            return "egovframework/com/dam/spe/req/EgovComDamRequestOfferDetail";

        }

        requestOfferService.deleteRequestOffer(knoId);

        return "forward:/dam/spe/req/listRequestOffer.do";

    }

}

