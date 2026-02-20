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
 * 媛쒖슂
 * - 留덉씠?섏씠吏?????Controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 留덉씠?섏씠吏 肄섑뀗痢좎쓽 ?깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 留덉씠?섏씠吏 肄섑뀗痢좎쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * - ?깅줉??肄섑뀗痢좊? 留덉씠?섏씠吏??異붽?, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * @author ?댁갹??
 * @version 1.0
 * @created 05-8-2009 ?ㅽ썑 2:19:27
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??       ?섏젙??          ?섏젙?댁슜
 *  ----------  ----------    ---------------------------
 *  2009.08.04  ?댁갹??         理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *  2016.8.31	源?고샇			?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *
 * Copyright (C) 2009 by MOPAS  All right reserved.
 * </pre>
 */
@Controller
public class EgovIndvdlPgeController {

	/** EgovMessageSource */
    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "EgovIndvdlPgeService")
    private EgovIndvdlPgeService egovIndvdlPgeService;

    /**
	 * 而⑦뀗痢?紐⑸줉??議고쉶?쒕떎.
	 * @param indvdlPgeVO - 留덉씠?섏씠吏 肄섑뀗痢?Vo
	 * @return
	 *
	 * @param indvdlPgeVO
	 */
	@IncludedInfo(name="留덉씠?섏씠吏愿由?, order = 480 ,gid = 50)
	@RequestMapping(value="/uss/mpe/selectIndvdlPgeList.do")
	public String selectIndvdlPgeList(@ModelAttribute("searchVO") IndvdlPgeVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.IndvdlPgeList */
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

        List<IndvdlPgeVO> list = egovIndvdlPgeService.selectIndvdlPgeList(searchVO);
        model.addAttribute("resultList", list);

        int totCnt = egovIndvdlPgeService.selectIndvdlPgeListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/uss/mpe/EgovIndvdlPgeList";
	}

	/**
     * 而⑦뀗痢?紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * @param indvdlPgeVO
     * @param searchVO
     * @param model
     * @return	"/uss/mpe/EgovIndvdlPgeDetail"
     * @throws Exception
     */
     @RequestMapping("/uss/mpe/selectIndvdlPgeDetail.do")
     public String selectIndvdlPgeDetail(IndvdlPgeVO indvdlPgeVO, @ModelAttribute("searchVO") IndvdlPgeVO searchVO, ModelMap model) throws Exception {

 		IndvdlPgeVO vo = egovIndvdlPgeService.selectIndvdlPgeDetail(indvdlPgeVO);

 		model.addAttribute("result", vo);

         return	"egovframework/com/uss/mpe/EgovIndvdlPgeDetail";
     }

     /**
      * 而⑦뀗痢??깅줉???④퀎
      * @param searchVO
      * @param model
      * @return	"/uss/mpe/EgovIndvdlPgeRegist"
      * @throws Exception
      */
     @RequestMapping("/uss/mpe/insertIndvdlPgeView.do")
     public String insertIndvdlPgeView(@ModelAttribute("searchVO") IndvdlPgeVO searchVO, Model model) throws Exception {

         model.addAttribute("indvdlPgeVO", new IndvdlPgeVO());

         return "egovframework/com/uss/mpe/EgovIndvdlPgeRegist";

     }

     /**
      * 而⑦뀗痢좊? ?깅줉?쒕떎.
      * @param searchVO
      * @param indvdlPgeVO
      * @param bindingResult
      * @return	"forward:/uss/mpe/selectIndvdlPgeList.do"
      * @throws Exception
      */
      @RequestMapping("/uss/mpe/insertIndvdlPge.do")
      public String insertIndvdlPge(
	  	@ModelAttribute("searchVO") IndvdlPgeVO searchVO,
		@Valid @ModelAttribute("indvdlPgeVO") IndvdlPgeVO indvdlPgeVO,
		BindingResult bindingResult) throws Exception {

  		if(bindingResult.hasErrors()){
  			return "egovframework/com/uss/mpe/EgovIndvdlPgeRegist";
  		}

          egovIndvdlPgeService.insertIndvdlPge(indvdlPgeVO);

          return "forward:/uss/mpe/selectIndvdlPgeList.do";
      }

      /**
       * 而⑦뀗痢좎젙蹂??섏젙 ??泥섎━
       * @param cntntsId
       * @param searchVO
       * @param model
       * @return	"/uss/mpe/EgovIndvdlPgeUpdt"
       * @throws Exception
       */
      @RequestMapping("/uss/mpe/updateIndvdlPgeView.do")
      public String updateIndvdlPgeView(@RequestParam("cntntsId") String cntntsId ,
              @ModelAttribute("searchVO") IndvdlPgeVO searchVO, ModelMap model)
              throws Exception {

    	  IndvdlPgeVO indvdlPgeVO = new IndvdlPgeVO();

          // Primary Key 媛??명똿
          indvdlPgeVO.setCntntsId(cntntsId);

          model.addAttribute("indvdlPgeVO", egovIndvdlPgeService.selectIndvdlPgeDetail(indvdlPgeVO));

          return "egovframework/com/uss/mpe/EgovIndvdlPgeUpdt";
      }

      /**
       * 而⑦뀗痢좎젙蹂대? ?섏젙?쒕떎.
       * @param searchVO
       * @param indvdlPgeVO
       * @param bindingResult
       * @return	"forward:/uss/mpe/selectIndvdlPgeList.do"
       * @throws Exception
       */
      @RequestMapping("/uss/mpe/updateIndvdlPge.do")
      public String updateIndvdlPge(
	  	@ModelAttribute("searchVO") IndvdlPgeVO searchVO,
		@Valid @ModelAttribute("indvdlPgeVO") IndvdlPgeVO indvdlPgeVO,
		BindingResult bindingResult) throws Exception {

 		if(bindingResult.hasErrors()){
  			return "egovframework/com/uss/mpe/EgovIndvdlPgeUpdt";
  		}

      	egovIndvdlPgeService.updateIndvdlPge(indvdlPgeVO);

          return "forward:/uss/mpe/selectIndvdlPgeList.do";

      }

}
