package egovframework.com.uss.olp.opr.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.uss.olp.opr.service.EgovOnlinePollResultService;
import egovframework.com.uss.olp.opr.service.OnlinePollResult;
import jakarta.annotation.Resource;

/**
 * ?⑤씪?퇠OLL寃곌낵瑜?泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Controller
public class EgovOnlinePollResultController {

    @Resource(name = "egovOnlinePollResultService")
    private EgovOnlinePollResultService egovOnlinePollResultService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * ?⑤씪?퇠OLL寃곌낵 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @param commandMap
     * @param onlinePollVO
     * @param model
     * @return "egovframework/com/uss/olp/opr/EgovOnlinePollResultList"
     * @throws Exception
     */
    @RequestMapping(value = "/uss/olp/opr/listOnlinePollResult.do")
    public String egovOnlinePollResultList(
            OnlinePollResult onlinePollResult,
            ModelMap model
            ) throws Exception {

        List<?> reusltList = egovOnlinePollResultService.selectOnlinePollResultList(onlinePollResult);
        model.addAttribute("resultList", reusltList);

        return "egovframework/com/uss/olp/opr/EgovOnlinePollResultList";
    }

    /**
     * ?⑤씪?퇠OLL寃곌낵 紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
     * @param searchVO
     * @param onlinePollVO
     * @param commandMap
     * @param model
     * @return
     *         "/uss/olp/opr/EgovOnlinePollDetail"
     * @throws Exception
     */
    @RequestMapping(value = "/uss/olp/opr/delOnlinePollResult.do")
    public String egovOnlinePollResultDetail(
            OnlinePollResult onlinePollResult,
            ModelMap model) throws Exception {

        egovOnlinePollResultService.deleteOnlinePollResult(onlinePollResult);
        return "forward:/uss/olp/opr/listOnlinePollResult.do";
    }




}
