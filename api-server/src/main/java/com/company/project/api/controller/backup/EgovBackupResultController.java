package com.company.project.api.controller.backup;

import com.company.project.service.backup.EgovBackupResultService;

import com.company.project.service.backup.dto.BackupResultDto;

import egovframework.com.cmm.EgovMessageSource;

import egovframework.com.cmm.annotation.IncludedInfo;

import egovframework.com.cmm.util.EgovUserDetailsHelper;

import jakarta.annotation.Resource;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageRequest;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

/**

 *                            ?     ?          ????controller ??  ???(Modernized)

 */

@Controller

public class EgovBackupResultController {

    @Resource(name = "backupResultService")

    private EgovBackupResultService backupResultService;

    @Resource(name = "propertiesService")

    private EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")

    private EgovMessageSource egovMessageSource;

    /**

     *                            ???????      .

     */

    @RequestMapping("/sym/sym/bak/deleteBackupResult.do")

    public String deleteBackupResult(@RequestParam("backupResultId") String backupResultId, ModelMap model)

            throws Exception {

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        backupResultService.deleteBackupResult(backupResultId);

        return "forward:/sym/sym/bak/getBackupResultList.do";

    }

    /**

     *                            ?         ???                  ???      .

     */

    @RequestMapping("/sym/sym/bak/getBackupResult.do")

    public String selectBackupResult(@RequestParam("backupResultId") String backupResultId, ModelMap model)

            throws Exception {

        BackupResultDto dto = backupResultService.getBackupResult(backupResultId);

        model.addAttribute("resultInfo", dto);

        return "egovframework/com/sym/sym/bak/EgovBackupResultDetail";

    }

    /**

     *                                         ??         ???      .

     */

    @IncludedInfo(name = "                           ?     ??", order = 1151, gid = 60)

    @RequestMapping({ "/sym/sym/bak/getBackupResultList.do", "/sym/sym/bak/EgovBackupResultList.do" })

    public String selectBackupResultList(

            @RequestParam(value = "sttus", required = false) String sttus,

            @RequestParam(value = "searchKeywordFrom", required = false) String searchKeywordFrom,

            @RequestParam(value = "searchKeywordTo", required = false) String searchKeywordTo,

            @RequestParam(value = "searchCondition", required = false) String searchCondition,

            @RequestParam(value = "searchKeyword", required = false) String searchKeyword,

            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,

            ModelMap model)

            throws Exception {

        int pageUnit = propertyService.getInt("pageUnit");

        int pageSize = propertyService.getInt("pageSize");

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(pageIndex);

        paginationInfo.setRecordCountPerPage(pageUnit);

        paginationInfo.setPageSize(pageSize);

        Page<BackupResultDto> page = backupResultService.getBackupResultList(

                sttus,

                searchKeywordFrom,

                searchKeywordTo,

                searchCondition,

                searchKeyword,

                PageRequest.of(pageIndex - 1, pageUnit));

        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());

        model.addAttribute("resultCnt", page.getTotalElements());

        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("sttus", sttus);

        model.addAttribute("searchKeywordFrom", searchKeywordFrom);

        model.addAttribute("searchKeywordTo", searchKeywordTo);

        model.addAttribute("searchCondition", searchCondition);

        model.addAttribute("searchKeyword", searchKeyword);

        return "egovframework/com/sym/sym/bak/EgovBackupResultList";

    }

}

