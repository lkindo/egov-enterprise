package com.company.project.api.controller.auth;

import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.validation.Valid;

/**
 * Í∂åÌïú Í¥ÄÎ¶¨Î? ?ÑÌïú Ïª®Ìä∏Î°§Îü¨ ?¥Îûò?? */
@Slf4j
@Controller
@RequiredArgsConstructor
public class AuthorManageController {

    private final AuthorManageService authorManageService;
    private final EgovPropertyService propertiesService;
    private final MessageSource messageSource;

    /**
     * Í∂åÌïú Î™©Î°ù??Ï°∞Ìöå?úÎã§.
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
        model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));

        return "sec/ram/EgovAuthorManage";
    }

    /**
     * Í∂åÌïú ?∏Î??ïÎ≥¥Î•?Ï°∞Ìöå?úÎã§.
     */
    @RequestMapping(value = { "/api/v1/auth/authors", "/sec/ram/EgovAuthor.do" })
    public String selectAuthor(@RequestParam("authorCode") String authorCode, ModelMap model)
            throws Exception {

        log.debug("AuthorManageController.selectAuthor called with {}", authorCode);

        AuthorManageDto dto = authorManageService.selectAuthor(authorCode);
        if (dto == null) {
            log.debug("dto is null. Creating empty dto.");
            dto = new AuthorManageDto();
            dto.setAuthorCode(authorCode);
            model.addAttribute("message", "?∞Ïù¥?∞Í? Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§.");
        } else {
            log.debug("found dto: {}", dto);
            model.addAttribute("message", messageSource.getMessage("success.common.select", null, LocaleContextHolder.getLocale()));
        }

        model.addAttribute("authorManage", dto);
        return "sec/ram/EgovAuthorUpdate";
    }

    /**
     * Í∂åÌïú ?±Î°ù ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @RequestMapping("/sec/ram/EgovAuthorInsertView.do")
    public String insertAuthorView(Model model) throws Exception {
        model.addAttribute("authorManage", new AuthorManageDto());
        return "sec/ram/EgovAuthorInsert";
    }

    /**
     * Í∂åÌïú ?ïÎ≥¥Î•??±Î°ù?úÎã§.
     */
    @PostMapping("/sec/ram/EgovAuthorInsert.do")
    public String insertAuthor(@Valid @ModelAttribute("authorManage") AuthorManageDto authorManage,
            BindingResult bindingResult, ModelMap model, RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {
            return "sec/ram/EgovAuthorInsert";
        }

        authorManageService.insertAuthor(authorManage);
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.insert", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/ram/EgovAuthorList.do";
    }

    /**
     * Í∂åÌïú ?ïÎ≥¥Î•??òÏ†ï?úÎã§.
     */
    @PostMapping("/sec/ram/EgovAuthorUpdate.do")
    public String updateAuthor(@Valid @ModelAttribute("authorManage") AuthorManageDto authorManage,
            BindingResult bindingResult, Model model, RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {
            return "sec/ram/EgovAuthorUpdate";
        }

        authorManageService.updateAuthor(authorManage);
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.update", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/ram/EgovAuthorList.do";
    }

    /**
     * Í∂åÌïú ?ïÎ≥¥Î•???†ú?úÎã§.
     */
    @PostMapping("/sec/ram/EgovAuthorDelete.do")
    public String deleteAuthor(@RequestParam("authorCode") String authorCode,
            RedirectAttributes redirectAttributes) throws Exception {

        authorManageService.deleteAuthor(authorCode);
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/ram/EgovAuthorList.do";
    }

    /**
     * Í∂åÌïú Î™©Î°ù??Î©Ä????†ú?úÎã§.
     */
    @PostMapping("/sec/ram/EgovAuthorListDelete.do")
    public String deleteAuthorList(@RequestParam("authorCodes") String authorCodes,
            RedirectAttributes redirectAttributes) throws Exception {

        String[] strAuthorCodes = authorCodes.split(";");
        authorManageService.deleteAuthors(strAuthorCodes);
        redirectAttributes.addFlashAttribute("message", messageSource.getMessage("success.common.delete", null, LocaleContextHolder.getLocale()));

        return "redirect:/sec/ram/EgovAuthorList.do";
    }

    /**
     * ?ëÍ∑º Í±∞Î? ?îÎ©¥?ºÎ°ú ?¥Îèô?úÎã§.
     */
    @RequestMapping("/sec/ram/accessDenied.do")
    public String accessDenied() throws Exception {
        return "sec/accessDenied";
    }
}
