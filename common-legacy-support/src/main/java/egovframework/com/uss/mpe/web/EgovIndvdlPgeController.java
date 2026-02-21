package egovframework.com.uss.mpe.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.uss.mpe.service.EgovIndvdlPgeService;
import egovframework.com.uss.mpe.service.IndvdlPgeVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ??
 * - ?????????Controller ?????? ???.
 *
 * ???
 * - ??? ?? ?, ??, ???? ?? ?? ???????.
 * - ??? ?? ??? ?, ??????.
 * - ?????? ???????, ???? ?????????.
 * 
 * @author ????
 * @version 1.0
 * @created 05-8-2009 ?? 2:19:27
 *
 *          <pre>
 * << ?????Modification Information) >>
 *
 *   ????       ????          ????
 *  ----------  ----------    ---------------------------
 *  2009.08.04  ????         ????
 *  2011.8.26	???		IncludedInfo annotation ??
 *  2016.8.31	?			???????3.6 ?
 *
 * Copyright (C) 2009 by MOPAS  All right reserved.
 *          </pre>
 **/
@Controller
public class EgovIndvdlPgeController {

    /** EgovMessageSource **/
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /** EgovPropertyService **/
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "egovIndvdlPgeService")
    private EgovIndvdlPgeService egovIndvdlPgeService;

    /**
     * ????????.
     * 
     * @param indvdlPgeVO - ??? ???Vo
     * @return
     *
     * @param indvdlPgeVO
     **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
    @RequestMapping(value = { "/uss/mpe/selectIndvdlPgeList.do", "/uss/mpe/EgovIndvdlPgeList.do" })
    public String selectIndvdlPgeList(@ModelAttribute("searchVO") IndvdlPgeVO searchVO, ModelMap model)
            throws Exception {

        /** EgovPropertyService.IndvdlPgeList **/
        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        /** pageing **/
        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<IndvdlPgeVO> list = egovIndvdlPgeService.selectIndvdlPgeList(searchVO);
        model.addAttribute("resultList", list);

        int totCnt = egovIndvdlPgeService.selectIndvdlPgeListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/uss/mpe/EgovIndvdlPgeList";
    }

    /**
     * ????????????????.
     * 
     * @param indvdlPgeVO
     * @param searchVO
     * @param model
     * @return " uss/mpe/EgovIndvdlPgeDetail"   
     * @throws Exception
     */
    @RequestMapping("/uss/mpe/selectIndvdlPgeDetail.do")
    public String selectIndvdlPgeDetail(IndvdlPgeVO indvdlPgeVO, @ModelAttribute("searchVO") IndvdlPgeVO searchVO,
            ModelMap model) throws Exception {

        IndvdlPgeVO vo = egovIndvdlPgeService.selectIndvdlPgeDetail(indvdlPgeVO);

        model.addAttribute("result", vo);

        return "egovframework/com/uss/mpe/EgovIndvdlPgeDetail";
    }

    /**
     * ?????????
     * 
     * @param searchVO
     * @param model
     * @return " uss/mpe/EgovIndvdlPgeRegist"   
     * @throws Exception
     */
    @RequestMapping("/uss/mpe/insertIndvdlPgeView.do")
    public String insertIndvdlPgeView(@ModelAttribute("searchVO") IndvdlPgeVO searchVO, Model model) throws Exception {

        model.addAttribute("indvdlPgeVO", new IndvdlPgeVO());

        return "egovframework/com/uss/mpe/EgovIndvdlPgeRegist";

    }

    /**
     * ??? ???.
     * 
     * @param searchVO
     * @param indvdlPgeVO
     * @param bindingResult
     * @return "forward: uss/mpe/selectIndvdlPgeList.do"   
     * @throws Exception
     */
    @RequestMapping("/uss/mpe/insertIndvdlPge.do")
    public String insertIndvdlPge(
            @ModelAttribute("searchVO") IndvdlPgeVO searchVO,
            @Valid @ModelAttribute("indvdlPgeVO") IndvdlPgeVO indvdlPgeVO,
            BindingResult bindingResult) throws Exception {

        if (bindingResult.hasErrors()) {
            return "egovframework/com/uss/mpe/EgovIndvdlPgeRegist";
        }

        egovIndvdlPgeService.insertIndvdlPge(indvdlPgeVO);

        return "forward:/uss/mpe/selectIndvdlPgeList.do";
    }

    /**
     * ????? ????
     * 
     * @param cntntsId
     * @param searchVO
     * @param model
     * @return " uss/mpe/EgovIndvdlPgeUpdt"   
     * @throws Exception
     */
    @RequestMapping("/uss/mpe/updateIndvdlPgeView.do")
    public String updateIndvdlPgeView(@RequestParam("cntntsId") String cntntsId,
            @ModelAttribute("searchVO") IndvdlPgeVO searchVO, ModelMap model)
            throws Exception {

        IndvdlPgeVO indvdlPgeVO = new IndvdlPgeVO();

        // Primary Key ??
        indvdlPgeVO.setCntntsId(cntntsId);

        model.addAttribute("indvdlPgeVO", egovIndvdlPgeService.selectIndvdlPgeDetail(indvdlPgeVO));

        return "egovframework/com/uss/mpe/EgovIndvdlPgeUpdt";
    }

    /**
     * ???? ????.
     * 
     * @param searchVO
     * @param indvdlPgeVO
     * @param bindingResult
     * @return "forward: uss/mpe/selectIndvdlPgeList.do"   
     * @throws Exception
     */
    @RequestMapping("/uss/mpe/updateIndvdlPge.do")
    public String updateIndvdlPge(
            @ModelAttribute("searchVO") IndvdlPgeVO searchVO,
            @Valid @ModelAttribute("indvdlPgeVO") IndvdlPgeVO indvdlPgeVO,
            BindingResult bindingResult) throws Exception {

        if (bindingResult.hasErrors()) {
            return "egovframework/com/uss/mpe/EgovIndvdlPgeUpdt";
        }

        egovIndvdlPgeService.updateIndvdlPge(indvdlPgeVO);

        return "forward:/uss/mpe/selectIndvdlPgeList.do";

    }

}
