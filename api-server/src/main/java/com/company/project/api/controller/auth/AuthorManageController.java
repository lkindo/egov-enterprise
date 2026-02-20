package com.company.project.api.controller.auth;

import com.company.project.service.auth.AuthorManageService;

import com.company.project.service.auth.dto.AuthorManageDto;

import egovframework.com.cmm.ComDefaultVO;

import egovframework.com.cmm.EgovMessageSource;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.stereotype.Controller;

import org.springframework.ui.Model;

import org.springframework.ui.ModelMap;

import org.springframework.validation.BindingResult;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import org.slf4j.Logger;

import org.slf4j.LoggerFactory;

import jakarta.annotation.Resource;

import jakarta.validation.Valid;

/**

 *             ??     ???      ?      ?      

 */

@Controller

@RequiredArgsConstructor

public class AuthorManageController {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthorManageController.class);

    private final AuthorManageService authorManageService;

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")

    EgovMessageSource egovMessageSource;

    /**

     *             ?            ?         ??

     */

    @RequestMapping({ "/sec/ram/EgovAuthorList.do", "/sec/ram/EgovAuthorManage.do" })

    public String selectAuthorList(@ModelAttribute("authorManageVO") ComDefaultVO searchVO, ModelMap model)

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

        model.addAttribute("authorList", authorManageService.selectAuthorList(searchVO));

        int totCnt = authorManageService.selectAuthorListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "sec/ram/EgovAuthorManage";

    }

    /**

     *             ??                   ??

     */

    @RequestMapping(value = { "/api/v1/auth/authors", "/sec/ram/EgovAuthor.do" })

    public String selectAuthor(@RequestParam("authorCode") String authorCode, ModelMap model)

            throws Exception {

        LOGGER.debug("AuthorManageController.selectAuthor called with {}", authorCode);

        AuthorManageDto dto = authorManageService.selectAuthor(authorCode);

        if (dto == null) {

            LOGGER.debug("dto is null. Creating empty dto.");

            dto = new AuthorManageDto();

            dto.setAuthorCode(authorCode);

            model.addAttribute("message", "??  ??            ??         ??????      ??      .");

        } else {

            LOGGER.debug("found dto: {}", dto);

            model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        }

        model.addAttribute("authorManage", dto);

        return "sec/ram/EgovAuthorUpdate";

    }

    /**

     *             ??          ?         

     */

    @RequestMapping("/sec/ram/EgovAuthorInsertView.do")

    public String insertAuthorView(Model model) throws Exception {

        model.addAttribute("authorManage", new AuthorManageDto());

        return "sec/ram/EgovAuthorInsert";

    }

    /**

     *             ??                   ??

     */

    @PostMapping("/sec/ram/EgovAuthorInsert.do")

    public String insertAuthor(@Valid @ModelAttribute("authorManage") AuthorManageDto authorManage,

            BindingResult bindingResult, ModelMap model, RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {

            return "sec/ram/EgovAuthorInsert";

        }

        authorManageService.insertAuthor(authorManage);

        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.insert"));

        return "redirect:/sec/ram/EgovAuthorList.do";

    }

    /**

     *             ???                ??

     */

    @PostMapping("/sec/ram/EgovAuthorUpdate.do")

    public String updateAuthor(@Valid @ModelAttribute("authorManage") AuthorManageDto authorManage,

            BindingResult bindingResult, Model model, RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {

            return "sec/ram/EgovAuthorUpdate";

        }

        authorManageService.updateAuthor(authorManage);

        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.update"));

        return "redirect:/sec/ram/EgovAuthorList.do";

    }

    /**

     *             ?????         ??

     */

    @PostMapping("/sec/ram/EgovAuthorDelete.do")

    public String deleteAuthor(@RequestParam("authorCode") String authorCode,

            RedirectAttributes redirectAttributes) throws Exception {

        authorManageService.deleteAuthor(authorCode);

        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.delete"));

        return "redirect:/sec/ram/EgovAuthorList.do";

    }

    /**

     *             ???       ????         ??

     */

    @PostMapping("/sec/ram/EgovAuthorListDelete.do")

    public String deleteAuthorList(@RequestParam("authorCodes") String authorCodes,

            RedirectAttributes redirectAttributes) throws Exception {

        String[] strAuthorCodes = authorCodes.split(";");

        authorManageService.deleteAuthors(strAuthorCodes);

        redirectAttributes.addFlashAttribute("message", egovMessageSource.getMessage("success.common.delete"));

        return "redirect:/sec/ram/EgovAuthorList.do";

    }

    /**

     *             ???       ?         

     */

    @RequestMapping("/sec/ram/accessDenied.do")

    public String accessDenied() throws Exception {

        return "sec/accessDenied";

    }

}

