package egovframework.com.cop.tpl.service;

import java.util.List;
import java.util.Map;


/**
 * ?쒗뵆由?愿由щ? ?꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??             ?섏젙??          ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2009.05.17   ?댁궪??          理쒖큹 ?앹꽦
 *  2019.05.17   ?좎슜??          selectTemplateWhiteList() 異붽?
 *
 * </pre>
 */
public interface EgovTemplateManageService {

    /**
     * ?쒗뵆由??뺣낫瑜???젣?쒕떎.
     * 
     * @param tmplatInf
     * @throws Exception
     */
    public void deleteTemplateInf(TemplateInf tmplatInf) throws Exception;

    /**
     * ?쒗뵆由??뺣낫瑜??깅줉?쒕떎.
     * 
     * @param tmplatInf
     * @throws Exception
     */
    public void insertTemplateInf(TemplateInf tmplatInf) throws Exception;

    /**
     * ?쒗뵆由??뺣낫瑜??섏젙?쒕떎.
     * 
     * @param tmplatInf
     * @throws Exception
     */
    public void updateTemplateInf(TemplateInf tmplatInf) throws Exception;

    /**
     * ?쒗뵆由우뿉 ????붿씠?몃━?ㅽ듃 紐⑸줉??議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public List<TemplateInfVO> selectTemplateWhiteList() throws Exception;
    
    /**
     * ?쒗뵆由우뿉 ???紐⑸줉瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public Map<String, Object> selectTemplateInfs(TemplateInfVO tmplatInfVO) throws Exception;

    /**
     * ?쒗뵆由우뿉 ????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public TemplateInfVO selectTemplateInf(TemplateInfVO tmplatInfVO) throws Exception;

    /**
     * ?쒗뵆由우뿉 ???誘몃━蹂닿린 ?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public TemplateInfVO selectTemplatePreview(TemplateInfVO tmplatInfVO) throws Exception;

    /**
     * ?쒗뵆由?援щ텇???곕Ⅸ 紐⑸줉??議고쉶?쒕떎.
     * 
     * @param tmplatInfVO
     * @return
     * @throws Exception
     */
    public List<TemplateInfVO> selectTemplateInfsByCode(TemplateInfVO tmplatInfVO) throws Exception;
}
