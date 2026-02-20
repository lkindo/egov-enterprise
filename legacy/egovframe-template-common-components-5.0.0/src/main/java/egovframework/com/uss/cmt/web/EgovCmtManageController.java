package egovframework.com.uss.cmt.web;

import java.util.List;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.cmt.service.CmtDefaultVO;
import egovframework.com.uss.cmt.service.CmtManageVO;
import egovframework.com.uss.cmt.service.EgovCmtManageService;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import jakarta.annotation.Resource;

/**
 * ?낅Т?ъ슜?먭????붿껌?? 鍮꾩??덉뒪 ?대옒?ㅻ줈 ?꾨떖?섍퀬 泥섎━??寃곌낵瑜? ?대떦
 * ???붾㈃?쇰줈 ?꾨떖?섎뒗  Controller瑜??뺤쓽?쒕떎
 * @author ?쒖??꾨젅?꾩썙??媛쒕컻?
 * @since 2014.08.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  ----------    --------    ---------------------------
 *  2014.08.29     媛쒕컻?       理쒖큹 ?앹꽦
 *  2019.01.10     ?댁젙?       異쒓렐 以묐났 ?뺤씤, ?닿렐 ??異쒓렐?щ? ?뺤씤 異붽?
 *
 * </pre>
 */
@Controller
public class EgovCmtManageController {

	/** cmtManageService */
    @Resource(name = "cmtManageService")
    private EgovCmtManageService cmtManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /** egovCmtManageIdGnrService */
    @Resource(name = "egovCmtManageIdGnrService")
    private EgovIdGnrService idgenService;

    /** EgovMessageSource */
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * 異쒓렐 ?뺣낫瑜??깅줉?쒕떎.
     * @param cmtManageVO ?ъ슜?먮벑濡앹젙蹂?
     * @param bindingResult ?낅젰媛믨?利앹슜 bindingResult
     * @param model ?붾㈃紐⑤뜽
     * @return forward:/uss/cmt/EgovCmtMange.do
     * @throws Exception
     */
    @RequestMapping(value = "/uss/cmt/EgovCmtWrkStartInsert.do")
    public String insertWrkStartCmtInfo(@ModelAttribute("cmtManageVO") CmtManageVO cmtManageVO, BindingResult bindingResult, Model model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        if (user != null && user.getUniqId() != null) {
            cmtManageVO.setEmplyrId(user.getUniqId());
        }
        if (user != null && user.getOrgnztId() != null) {
            cmtManageVO.setOrgnztId(user.getOrgnztId());
        }
        cmtManageVO.setWrktDt(EgovDateUtil.getToday());

        //異쒓렐 以묐났 ?뺤씤
        String wrktmId = cmtManageService.selectWrktmId(cmtManageVO);
        if (wrktmId != null) {
            model.addAttribute("message", egovMessageSource.getMessage("ussCmt.cmtManageList.validate.wrkStartAlert")); //?대? 異쒓렐 ?곹깭?낅땲??
            return "forward:/uss/cmt/EgovCmtManageList.do";
        } else {
            cmtManageService.insertWrkStartCmtInfo(cmtManageVO);
        }
        return "forward:/uss/cmt/EgovCmtManageList.do";
    }

    /**
     * ?닿렐 ?뺣낫瑜??깅줉?쒕떎.
     * @param cmtManageVO ?ъ슜?먮벑濡앹젙蹂?
     * @param bindingResult ?낅젰媛믨?利앹슜 bindingResult
     * @param model ?붾㈃紐⑤뜽
     * @return forward:/uss/cmt/EgovCmtMange.do
     * @throws Exception
     */
    @RequestMapping(value = "/uss/cmt/EgovCmtWrkEndInsert.do")
    public String insertWrkEndCmtInfo(@ModelAttribute("cmtManageVO") CmtManageVO cmtManageVO, BindingResult bindingResult, Model model) throws Exception {

        LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

        if (user != null && user.getUniqId() != null) {
            cmtManageVO.setEmplyrId(user.getUniqId());
        }
        if (user != null && user.getOrgnztId() != null) {
            cmtManageVO.setOrgnztId(user.getOrgnztId());
        }
        cmtManageVO.setWrktDt(EgovDateUtil.getToday());

        // 異쒓렐?щ? 泥댄겕
        String wrktmId = cmtManageService.selectWrktmId(cmtManageVO);
        if (wrktmId != null) {
            cmtManageService.insertWrkEndCmtInfo(cmtManageVO);
            return "forward:/uss/cmt/EgovCmtManageList.do";
        }
        model.addAttribute("message",
                egovMessageSource.getMessage("ussCmt.cmtManageList.validate.wrkStartBeforeEndAlert"));// 癒쇱? 異쒓렐?깅줉???댁＜?몄슂.
        return "forward:/uss/cmt/EgovCmtManageList.do";

    }

    /**
     * 異쒗눜洹쇰ぉ濡앹쓣 議고쉶?쒕떎. (paging)
     * @param userSearchVO 寃?됱“嫄댁젙蹂?
     * @param model ?붾㈃紐⑤뜽
     * @return cmm/uss/umt/EgovCmtManageList
     * @throws Exception
     */
    @IncludedInfo(name = "異쒗눜洹쇨?由?, order = 950, gid = 50)
    @RequestMapping(value = "/uss/cmt/EgovCmtManageList.do")
    public String selectUserCmtList(@ModelAttribute("cmtSearchVO") CmtDefaultVO cmtSearchVO, ModelMap model) throws Exception {

        List<CmtManageVO> resultList = cmtManageService.selectCmtInfoList(cmtSearchVO);
        model.addAttribute("resultList", resultList);

        return "egovframework/com/uss/cmt/EgovCmtManageList";
    }

}
