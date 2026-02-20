package com.company.project.api.controller.program;

import com.company.project.service.program.ProgramService;

import com.company.project.service.program.dto.ProgramDto;

import egovframework.com.cmm.ComDefaultVO;

import egovframework.com.cmm.EgovMessageSource;

import jakarta.annotation.Resource;

import lombok.RequiredArgsConstructor;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.stereotype.Controller;

import org.springframework.ui.Model;

import org.springframework.validation.BindingResult;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.ModelAttribute;

import org.springframework.web.bind.annotation.PostMapping;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import egovframework.com.sym.prm.service.EgovProgrmManageService;

import egovframework.com.sym.prm.service.ProgrmManageDtlVO;

import egovframework.com.cmm.util.EgovUserDetailsHelper;

import egovframework.com.cmm.LoginVO;

import egovframework.com.utl.fcc.service.EgovStringUtil;

import egovframework.com.cop.ems.service.EgovSndngMailRegistService;

import egovframework.com.cop.ems.service.SndngMailVO;

import java.util.Map;

import java.util.List;

@Controller

@RequiredArgsConstructor

public class ProgramController {

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")

    EgovMessageSource egovMessageSource;

    private final ProgramService programService;

    @Resource(name = "progrmManageService")

    private EgovProgrmManageService progrmManageService;

    @Resource(name = "sndngMailRegistService")

    private EgovSndngMailRegistService sndngMailRegistService;

    /**

     * ?                  ?      ?       ?         ?        ??

     */

    @GetMapping(value = { "/sym/prm/EgovProgramListManageSelect.do", "/sym/prm/EgovProgramListManage.do" })

    public String selectProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model) throws Exception {

        // Pagination logic

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        model.addAttribute("list_progrmmanage", programService.selectProgrmList(searchVO));

        model.addAttribute("searchVO", searchVO);

        int totCnt = programService.selectProgrmListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "sym/prm/EgovProgramListManage";

    }

    /**

     * ?                  ??                  ??

     */

    @RequestMapping(value = "/sym/prm/EgovProgramListDetailSelect.do")

    public String selectProgrm(@RequestParam("tmp_progrmNm") String tmp_progrmNm,

            @ModelAttribute("searchVO") ComDefaultVO searchVO, Model model) throws Exception {

        searchVO.setSearchKeyword(tmp_progrmNm);

        // Using Entity directly as VO for simplicity in migration

        ProgramDto progrmManageVO = programService.selectProgrmById(tmp_progrmNm);

        model.addAttribute("progrmManageVO", progrmManageVO);

        return "sym/prm/EgovProgramListDetailSelectUpdt";

    }

    /**

     * ?                  ??          ?         

     */

    @GetMapping(value = "/sym/prm/EgovProgramListRegist.do")

    public String insertProgrmListView(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)

            throws Exception {

        model.addAttribute("progrmManageVO", new ProgramDto());

        return "sym/prm/EgovProgramListRegist";

    }

    /**

     * ?                  ??                   ??

     */

    @PostMapping(value = "/sym/prm/EgovProgramListRegist.do")

    public String insertProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO,

            @ModelAttribute("progrmManageVO") ProgramDto progrmManageVO,

            BindingResult bindingResult, Model model,

            RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {

            return "sym/prm/EgovProgramListRegist";

        }

        if (progrmManageVO.getProgrmDc() == null || progrmManageVO.getProgrmDc().equals("")) {

            progrmManageVO.setProgrmDc(" ");

        }

        programService.insertProgrm(progrmManageVO);

        String resultMsg = egovMessageSource.getMessage("success.common.insert");

        redirectAttributes.addAttribute("resultMsg", resultMsg);

        return "redirect:/sym/prm/EgovProgramListManageSelect.do";

    }

    /**

     * ?                  ???                ??

     */

    @PostMapping(value = "/sym/prm/EgovProgramListDetailSelectUpdt.do")

    public String updateProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO,

            @ModelAttribute("progrmManageVO") ProgramDto progrmManageVO,

            BindingResult bindingResult, Model model,

            RedirectAttributes redirectAttributes) throws Exception {

        if (bindingResult.hasErrors()) {

            return "sym/prm/EgovProgramListDetailSelectUpdt";

        }

        programService.updateProgrm(progrmManageVO);

        String resultMsg = egovMessageSource.getMessage("success.common.update");

        redirectAttributes.addAttribute("resultMsg", resultMsg);

        return "redirect:/sym/prm/EgovProgramListManageSelect.do";

    }

    /**

     * ?                  ?????         ??

     */

    @PostMapping(value = "/sym/prm/EgovProgramListManageDelete.do")

    public String deleteProgrmList(@ModelAttribute("searchVO") ComDefaultVO searchVO,

            @ModelAttribute("progrmManageVO") ProgramDto progrmManageVO,

            Model model, RedirectAttributes redirectAttributes) throws Exception {

        programService.deleteProgrm(progrmManageVO);

        String resultMsg = egovMessageSource.getMessage("success.common.delete");

        redirectAttributes.addAttribute("resultMsg", resultMsg);

        return "redirect:/sym/prm/EgovProgramListManageSelect.do";

    }

    /**

     * ?                  ?      ?               ??????

     */

    @PostMapping("/sym/prm/EgovProgrmManageListDelete.do")

    public String deleteProgrmManageList(@RequestParam("checkedProgrmFileNmForDel") String checkedProgrmFileNmForDel,

            @ModelAttribute("searchVO") ComDefaultVO searchVO,

            Model model,

            RedirectAttributes redirectAttributes) throws Exception {

        programService.deleteProgrmManageList(checkedProgrmFileNmForDel);

        String resultMsg = egovMessageSource.getMessage("success.common.delete");

        redirectAttributes.addAttribute("resultMsg", resultMsg);

        return "redirect:/sym/prm/EgovProgramListManageSelect.do";

    }

    /**

     * ?                  ????            ??         ???      . (??      )

     */

    @RequestMapping(value = "/sym/prm/EgovProgramListSearch.do")

    public String selectProgrmListSearch(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)

            throws Exception {

        // Pagination

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        model.addAttribute("list_progrmmanage", programService.selectProgrmList(searchVO));

        model.addAttribute("paginationInfo", paginationInfo);

        return "sym/prm/EgovFileNmSearch";

    }

    /**

     * ?                  ?      ?         ?      ??      ?         ???      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChangeRequstSelect.do")

    public String selectProgrmChangeRequstList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)

            throws Exception {

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        // ??                ??

        /** EgovPropertyService.sample */

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        /** pageing */

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<ProgrmManageDtlVO> resultList = progrmManageService.selectProgrmChangeRequstList(searchVO);

        model.addAttribute("list_changerequst", resultList);

        int totCnt = progrmManageService.selectProgrmChangeRequstListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/prm/EgovProgramChangeRequst";

    }

    /**

     * ?                  ?      ?         ?      ??      ?       ?                  ???      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChangRequstDetailSelect.do")

    public String selectProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,

            Model model) throws Exception {

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        if (progrmManageDtlVO.getProgrmFileNm() == null || progrmManageDtlVO.getProgrmFileNm().equals("")) {

            progrmManageDtlVO.setProgrmFileNm(progrmManageDtlVO.getTmpProgrmNm());

            int tmpNo = progrmManageDtlVO.getTmpRqesterNo();

            progrmManageDtlVO.setRqesterNo(tmpNo);

        }

        ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequst(progrmManageDtlVO);

        model.addAttribute("progrmManageDtlVO", resultVO);

        return "egovframework/com/sym/prm/EgovProgramChangRequstDetailSelectUpdt";

    }

    /**

     * ?                  ?      ?         ?      ??         ???            ??                  ?      ?         ?      ????         ??      .

     */

    /* ?                  ?      ?         ?      ?         ?*/

    @RequestMapping(value = "/sym/prm/EgovProgramChangRequstStre.do")

    public String insertProgrmChangeRequst(@RequestParam Map<?, ?> commandMap,

            @ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, BindingResult bindingResult,

            Model model) throws Exception {

        String resultMsg = "";

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        //          ???            ??         

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        String sLocationUrl = null;

        String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

        if (sCmd.equals("insert")) {

            // beanValidator          ??

            if (bindingResult.hasErrors()) {

                sLocationUrl = "egovframework/com/sym/prm/EgovProgramChangRequstStre";

                return sLocationUrl;

            }

            if (progrmManageDtlVO.getChangerqesterCn() == null || progrmManageDtlVO.getChangerqesterCn().equals("")) {

                progrmManageDtlVO.setChangerqesterCn(" ");

            }

            if (progrmManageDtlVO.getRqesterProcessCn() == null || progrmManageDtlVO.getRqesterProcessCn().equals("")) {

                progrmManageDtlVO.setRqesterProcessCn(" ");

            }

            progrmManageService.insertProgrmChangeRequst(progrmManageDtlVO);

            resultMsg = egovMessageSource.getMessage("success.common.insert");

            sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstSelect.do";

        } else {

            /* MAX?                  ??         ??*/

            ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequstNo(progrmManageDtlVO);

            progrmManageDtlVO.setRqesterNo(resultVO.getRqesterNo());

            progrmManageDtlVO.setRqesterPersonId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

            sLocationUrl = "egovframework/com/sym/prm/EgovProgramChangRequstStre";

        }

        model.addAttribute("resultMsg", resultMsg);

        return sLocationUrl;

    }

    /**

     * ?                  ?      ?   ??         ????       ??      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChangRequstDetailSelectUpdt.do")

    public String updateProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,

            BindingResult bindingResult, Model model) throws Exception {

        String sLocationUrl = null;

        String resultMsg = "";

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        //          ???            ??         

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        // beanValidator          ??

        if (bindingResult.hasErrors()) {

            sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";

            return sLocationUrl;

        }

        // KISA             ??                ??(2018-10-29, ??      ??

        if (EgovStringUtil.isNullToString(progrmManageDtlVO.getRqesterPersonId())

                .equals(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()))) {

            if (progrmManageDtlVO.getChangerqesterCn() == null || progrmManageDtlVO.getChangerqesterCn().equals("")) {

                progrmManageDtlVO.setChangerqesterCn(" ");

            }

            if (progrmManageDtlVO.getRqesterProcessCn() == null || progrmManageDtlVO.getRqesterProcessCn().equals("")) {

                progrmManageDtlVO.setRqesterProcessCn(" ");

            }

            progrmManageService.updateProgrmChangeRequst(progrmManageDtlVO);

            resultMsg = egovMessageSource.getMessage("success.common.update");

            sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstSelect.do";

        } else {

            resultMsg = "??      ????      ?????     ??                  ?      ???      ??                  ?      ??      ???              ?        ??      .";

            progrmManageDtlVO.setTmpProgrmNm(progrmManageDtlVO.getProgrmFileNm());

            progrmManageDtlVO.setTmpRqesterNo(progrmManageDtlVO.getRqesterNo());

            sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";

        }

        model.addAttribute("resultMsg", resultMsg);

        return sLocationUrl;

    }

    /**

     * ?                  ?      ?   ??         ????????      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChangRequstDelete.do")

    public String deleteProgrmChangeRequst(@ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO,

            Model model) throws Exception {

        String sLocationUrl = null;

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        //          ???            ??         

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        // KISA             ??                ??(2018-10-29, ??      ??

        if (EgovStringUtil.isNullToString(progrmManageDtlVO.getRqesterPersonId())

                .equals(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getId()))) {

            // progrmManageDtlVO.setRqesterPersonId(user.getId());

            model.addAttribute("resultMsg", egovMessageSource.getMessage("success.common.delete"));

            progrmManageService.deleteProgrmChangeRequst(progrmManageDtlVO);

            sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstSelect.do";

        } else {

            model.addAttribute("resultMsg",

                    egovMessageSource.getMessage("comSymPrm.progrmManageController.checkRqesterPersonId")); // ?????

            sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstDetailSelect.do";

        }

        return sLocationUrl;

    }

    /**

     * ?                  ?      ?   ??         ??????         ????   ??         ???      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChangeRequstProcessListSelect.do")

    public String selectProgrmChangeRequstProcessList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)

            throws Exception {

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        // ??                ??

        /** EgovPropertyService.sample */

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        /** pageing */

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<?> resultList = progrmManageService.selectChangeRequstProcessList(searchVO);

        model.addAttribute("list_changerequst", resultList);

        int totCnt = progrmManageService.selectChangeRequstProcessListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/prm/EgovProgramChangeRequstProcess";

    }

    /**

     * ?                  ?      ?   ??         ??????         ????   ???                  ???      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDetailSelect.do")

    public String selectProgrmChangRequstProcess(

            @ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, Model model) throws Exception {

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        if (progrmManageDtlVO.getProgrmFileNm() == null) {

            progrmManageDtlVO.setProgrmFileNm(progrmManageDtlVO.getTmpProgrmNm());

            progrmManageDtlVO.setRqesterNo(progrmManageDtlVO.getTmpRqesterNo());

        }

        ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequst(progrmManageDtlVO);

        if (resultVO.getProcessDe() != null) {

            resultVO.setProcessDe(resultVO.getProcessDe().trim());// 2011.08.22

        }

        if (resultVO.getOpetrId() == null) {

            LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

            resultVO.setOpetrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

        }

        model.addAttribute("progrmManageDtlVO", resultVO);

        return "egovframework/com/sym/prm/EgovProgramChangRequstProcessDetailSelectUpdt";

    }

    /**

     * ?                  ?      ?         ?      ?         ???      ????       ??      .

     */

    @SuppressWarnings("unused")

    @RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDetailSelectUpdt.do")

    public String updateProgrmChangRequstProcess(

            @ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, BindingResult bindingResult,

            Model model) throws Exception {

        String sLocationUrl = null;

        boolean result = true;

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        if (bindingResult.hasErrors()) {

            sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstProcessDetailSelect.do";

            return sLocationUrl;

        }

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        // KISA             ??                ??(2018-10-29, ??      ??

        if (progrmManageDtlVO.getOpetrId() != null) {

            if (progrmManageDtlVO.getOpetrId()

                    .equals(user == null ? "" : EgovStringUtil.isNullToString(user.getId()))) {

                if (progrmManageDtlVO.getChangerqesterCn() == null

                        || progrmManageDtlVO.getChangerqesterCn().equals("")) {

                    progrmManageDtlVO.setChangerqesterCn(" ");

                }

                if (progrmManageDtlVO.getRqesterProcessCn() == null

                        || progrmManageDtlVO.getRqesterProcessCn().equals("")) {

                    progrmManageDtlVO.setRqesterProcessCn(" ");

                }

                progrmManageService.updateProgrmChangeRequstProcess(progrmManageDtlVO);

                model.addAttribute("resultMsg", egovMessageSource.getMessage("success.common.update"));

                ProgrmManageDtlVO vo = new ProgrmManageDtlVO();

                vo = progrmManageService.selectRqesterEmail(progrmManageDtlVO);

                String sTemp = null;

                // KISA             ??                ??(2018-10-29, ??      ??

                if ("A".equals(progrmManageDtlVO.getProcessSttus())) {

                    sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusA"); // ?            ?

                } else if ("P".equals(progrmManageDtlVO.getProcessSttus())) {

                    sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusP"); //                   ?

                } else if ("R".equals(progrmManageDtlVO.getProcessSttus())) {

                    sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusR"); //          ??

                } else if ("C".equals(progrmManageDtlVO.getProcessSttus())) {

                    sTemp = egovMessageSource.getMessage("comSymPrm.progrmManageController.processSttusC"); //          ??

                }

                // ?                  ??                 ?      ???   ????     ??                ???      .(         ??         ?         ????      )

                SndngMailVO sndngMailVO = new SndngMailVO();

                sndngMailVO.setDsptchPerson(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

                sndngMailVO.setRecptnPerson(vo.getTmpEmail());

                sndngMailVO.setSj(egovMessageSource.getMessage("comSymPrm.progrmManageController.email.Sj")); // ?                  ?      ?         ?      ?

                                                                                                              //          ??

                sndngMailVO.setEmailCn(

                        egovMessageSource.getMessage("comSymPrm.progrmManageController.email.emailCn") + " : " + sTemp); // ?                  ??

                                                                                                                         //                  ?      ?

                                                                                                                         // ??   ??

                                                                                                                         //          ??

                                                                                                                         // ??   ???     ??

                sndngMailVO.setAtchFileId(null);

                result = sndngMailRegistService.insertSndngMail(sndngMailVO);

                sLocationUrl = "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do";

            } else {

                model.addAttribute("resultMsg", egovMessageSource

                        .getMessage("comSymPrm.progrmManageController.updateProgrmChangRequstProcess.fail")); // ??      ??

                                                                                                              // ??      ?????     ??

                                                                                                              //                  ?      ?         ?

                                                                                                              // ??      ??

                                                                                                              //                           ?   ??

                                                                                                              // ??  ??   ?   

                                                                                                              //          ?      ??        ??      .

                progrmManageDtlVO.setTmpProgrmNm(progrmManageDtlVO.getProgrmFileNm());

                progrmManageDtlVO.setTmpRqesterNo(progrmManageDtlVO.getRqesterNo());

                sLocationUrl = "forward:/sym/prm/EgovProgramChangRequstProcessDetailSelect.do";

            }

        }

        return sLocationUrl;

    }

    /**

     * ?                  ?      ?         ?      ?         ?? ??????      .

     */

    /* ?                  ?      ?         ?      ?         ?????*/

    @RequestMapping(value = "/sym/prm/EgovProgramChangRequstProcessDelete.do")

    public String deleteProgrmChangRequstProcess(

            @ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, Model model) throws Exception {

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        progrmManageService.deleteProgrmChangeRequst(progrmManageDtlVO);

        return "forward:/sym/prm/EgovProgramChangeRequstProcessListSelect.do";

    }

    /**

     * ?                  ?      ?         ??   ???      ??         ???      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChgHstListSelect.do")

    public String selectProgrmChgHstList(@ModelAttribute("searchVO") ComDefaultVO searchVO, Model model)

            throws Exception {

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        // ??                ??

        /** EgovPropertyService.sample */

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));

        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        /** pageing */

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());

        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());

        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());

        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());

        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<ProgrmManageDtlVO> resultList = progrmManageService.selectProgrmChangeRequstList(searchVO);

        model.addAttribute("list_changerequst", resultList);

        int totCnt = progrmManageService.selectProgrmChangeRequstListTotCnt(searchVO);

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/sym/prm/EgovProgramChgHst";

    }

    /**

     * ?                  ?      ?         ??   ???                  ???      .

     */

    @RequestMapping(value = "/sym/prm/EgovProgramChgHstListDetailSelect.do")

    public String selectProgramChgHstListDetail(

            @ModelAttribute("progrmManageDtlVO") ProgrmManageDtlVO progrmManageDtlVO, Model model) throws Exception {

        // 0. Spring Security ????   ?   ??         ??

        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {

            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));

            return "redirect:/uat/uia/egovLoginUsr.do";

        }

        progrmManageDtlVO.setProgrmFileNm(progrmManageDtlVO.getTmpProgrmNm());

        progrmManageDtlVO.setRqesterNo(progrmManageDtlVO.getTmpRqesterNo());

        ProgrmManageDtlVO resultVO = progrmManageService.selectProgrmChangeRequst(progrmManageDtlVO);

        model.addAttribute("resultVO", resultVO);

        return "egovframework/com/sym/prm/EgovProgramChgHstDetail";

    }

}

