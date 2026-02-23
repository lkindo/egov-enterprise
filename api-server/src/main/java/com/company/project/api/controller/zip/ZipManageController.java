package com.company.project.api.controller.zip;

import com.company.project.service.zip.ZipManageService;

import com.company.project.service.zip.dto.ZipDto;

import egovframework.com.cmm.ComDefaultVO;

import com.company.project.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.validation.BindingResult;

import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.Map;

/**

 * ?                  ???     ???      ?      ?      

 */

@Controller

@RequiredArgsConstructor

public class ZipManageController {

    private final ZipManageService zipManageService;
    private final EgovPropertyService propertiesService;

    /**

     * ?                  ??            ???       ?         

     */

    @RequestMapping(value = "/sym/cmm/EgovCcmZipSearchPopup.do")

    public String callZipSearchPopup(ModelMap model) throws Exception {

        return "cmm/sym/zip/EgovCcmZipSearchPopup";

    }

    /**

     * ?                  ??            ?            ?         ??(??      ??

     */

    @RequestMapping(value = "/sym/cmm/EgovCcmZipSearchList.do")

    public String selectZipSearchList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model)

            throws Exception {

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        model.addAttribute("resultList", zipManageService.selectZipList(searchVO));

        int totCnt = zipManageService.selectZipListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "cmm/sym/zip/EgovCcmZipSearchList";

    }

    /**

     * ?                  ??            ?         ??

     */

    @RequestMapping(value = "/sym/ccm/zip/EgovCcmZipList.do")

    public String selectZipList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        model.addAttribute("resultList", zipManageService.selectZipList(searchVO));

        int totCnt = zipManageService.selectZipListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "cmm/sym/zip/EgovCcmZipList";

    }

    /**

     * ?                  ???                   ??

     */

    @RequestMapping(value = "/sym/ccm/zip/EgovCcmZipDetail.do")

    public String selectZipDetail(ZipDto zip, ModelMap model) throws Exception {

        ZipDto vo = zipManageService.selectZipDetail(zip);

        model.addAttribute("result", vo);

        return "cmm/sym/zip/EgovCcmZipDetail";

    }

    /**

     * ?                  ???          ?         

     */

    @GetMapping(value = "/sym/ccm/zip/EgovCcmZipRegist.do")

    public String insertZipView(ModelMap model) throws Exception {

        model.addAttribute("zip", new ZipDto());

        return "cmm/sym/zip/EgovCcmZipRegist";

    }

    /**

     * ?                  ???                   ??

     */

    @PostMapping(value = "/sym/ccm/zip/EgovCcmZipRegist.do")
    public String insertZip(
            @Valid @ModelAttribute("zip") ZipDto zip, BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("zip", zip);
            return "cmm/sym/zip/EgovCcmZipRegist";
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        zip.setFrstRegisterId(userDetails.getUser().getEsntlId());

        zipManageService.insertZip(zip);
        return "forward:/sym/ccm/zip/EgovCcmZipList.do";
    }

    /**

     * ?                  ????       ?         /         ??

     */

    @RequestMapping(value = "/sym/ccm/zip/EgovCcmZipModify.do")
    public String updateZip(
            @Valid @ModelAttribute("zip") ZipDto zip, BindingResult bindingResult,
            @RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

        String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
        if (sCmd.equals("")) {
            ZipDto vo = zipManageService.selectZipDetail(zip);
            model.addAttribute("zip", vo);
            return "cmm/sym/zip/EgovCcmZipModify";
        } else if (sCmd.equals("Modify")) {
            if (bindingResult.hasErrors()) {
                return "cmm/sym/zip/EgovCcmZipModify";
            }

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
            zip.setLastUpdusrId(userDetails.getUser().getEsntlId());

            zipManageService.updateZip(zip);
            return "forward:/sym/ccm/zip/EgovCcmZipList.do";
        } else {
            return "forward:/sym/ccm/zip/EgovCcmZipList.do";
        }
    }

    /**

     * ?                  ??????

     */

    @RequestMapping(value = "/sym/ccm/zip/EgovCcmZipRemove.do")

    public String deleteZip(ZipDto zip, ModelMap model) throws Exception {

        zipManageService.deleteZip(zip);

        return "forward:/sym/ccm/zip/EgovCcmZipList.do";

    }

}

