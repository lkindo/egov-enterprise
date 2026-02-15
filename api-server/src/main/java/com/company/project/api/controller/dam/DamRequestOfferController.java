package com.company.project.api.controller.dam;

import com.company.project.domain.dam.KnowledgeRequest;
import com.company.project.service.dam.EgovMapKnoService;
import com.company.project.service.dam.EgovMapTeamService;
import com.company.project.service.dam.EgovRequestOfferService;
import com.company.project.service.dam.dto.KnowledgeRequestDto;
import com.company.project.service.dam.dto.MapTeamDto;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.FileVO;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/dam/spe/req")
public class DamRequestOfferController {

    @Resource(name = "egovRequestOfferServiceImpl")
    private EgovRequestOfferService requestOfferService;

    @Resource(name = "egovMapTeamServiceImpl")
    private EgovMapTeamService mapTeamService;

    @Resource(name = "egovMapKnoServiceImpl")
    private EgovMapKnoService mapKnoService;

    @Resource(name = "EgovFileMngService")
    private EgovFileMngService fileMngService;

    @Resource(name = "EgovFileMngUtil")
    private EgovFileMngUtil fileUtil;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    @IncludedInfo(name = "지식정보제공", listUrl = "/dam/spe/req/listRequestOffer.do", order = 1291, gid = 80)
    @RequestMapping(value = "/listRequestOffer.do")
    public String selectRequestOfferList(
            @RequestParam(value = "searchCondition", required = false) String searchCondition,
            @RequestParam(value = "searchKeyword", required = false) String searchKeyword,
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            ModelMap model) throws Exception {

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

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

        if (requestOfferService.isSpecialist(loginVO.getUniqId())) {
            model.addAttribute("IS_SPE", "Y");
        } else {
            model.addAttribute("IS_SPE", "N");
            model.addAttribute("USER_UNIQ_ID", loginVO.getUniqId());
        }

        return "egovframework/com/dam/spe/req/EgovComDamRequestOfferList";
    }

    @RequestMapping(value = "/detailRequestOffer.do")
    public String selectRequestOfferDetail(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {
        KnowledgeRequestDto result = requestOfferService.selectRequestOfferDetail(knoId);
        model.addAttribute("requestOfferVO", result);

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        if (requestOfferService.isSpecialist(loginVO.getUniqId())) {
            model.addAttribute("IS_SPE", "Y");
        } else {
            model.addAttribute("IS_SPE", "N");
        }
        model.addAttribute("USER_UNIQ_ID", loginVO.getUniqId());

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

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        List<MultipartFile> files = multiRequest.getFiles("file_1");
        String atchFileId = "";
        if (!files.isEmpty()) {
            List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
            atchFileId = fileMngService.insertFileInfs(fvoList);
            requestDto.setAtchFileId(atchFileId);
        }

        requestDto.setFrstRegisterId(loginVO.getUniqId());
        requestDto.setEmplyrId(loginVO.getUniqId());

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

        LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        requestDto.setLastUpdusrId(loginVO.getUniqId());

        String atchFileId = requestDto.getAtchFileId();
        List<MultipartFile> files = multiRequest.getFiles("file_1");
        if (!files.isEmpty()) {
            String atchFileAt = commandMap.get("atchFileAt");
            if ("N".equals(atchFileAt)) {
                List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
                atchFileId = fileMngService.insertFileInfs(fvoList);
                requestDto.setAtchFileId(atchFileId);
            } else {
                FileVO fvo = new FileVO();
                fvo.setAtchFileId(atchFileId);
                int fileKeyParam = fileMngService.getMaxFileSN(fvo);
                List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
                fileMngService.updateFileInfs(fvoList);
            }
        }

        requestOfferService.updateRequestOffer(requestDto);
        return "forward:/dam/spe/req/listRequestOffer.do";

    }

    @RequestMapping(value = "/deleteRequestOffer.do")
    public String deleteRequestOffer(@RequestParam("knoId") String knoId, ModelMap model) throws Exception {
        if (requestOfferService.getReplyCount(knoId) > 0) {
            String resultScript = "<script>alert('하위 답변이 등록되어 있어 삭제할 수 없습니다!'); history.back();</script>";
            model.addAttribute("reusltScript", resultScript);
            return "egovframework/com/dam/spe/req/EgovComDamRequestOfferDetail";
        }
        requestOfferService.deleteRequestOffer(knoId);
        return "forward:/dam/spe/req/listRequestOffer.do";
    }
}
