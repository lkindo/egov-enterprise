package egovframework.com.cop.bbs.service;

import java.util.Map;

/**
 * 留뚯”?꾩“?щ? ?꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.29  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovBBSSatisfactionService {
    /**
     * 留뚯”?꾩“???ъ슜 媛???щ?瑜??뺤씤?쒕떎.
     * 
     * @param bbsId
     * @return
     * @throws Exception
     */
    public boolean canUseSatisfaction(String bbsId) throws Exception;
    
    /**
     * 留뚯”?꾩“?ъ뿉 ???紐⑸줉??議고쉶 ?쒕떎.
     * 
     * @param satisfactionVO
     * @return
     * @throws Exception
     */
    public Map<String, Object> selectSatisfactionList(SatisfactionVO satisfactionVO) throws Exception;
    
    /**
     * 留뚯”?꾩“?щ? ?깅줉?쒕떎.
     * 
     * @param satisfaction
     * @throws Exception
     */
    public void insertSatisfaction(Satisfaction satisfaction) throws Exception;
    
    /**
     * 留뚯”?꾩“?щ? ??젣?쒕떎.
     * 
     * @param satisfactionVO
     * @throws Exception
     */
    public void deleteSatisfaction(SatisfactionVO satisfactionVO) throws Exception;
    
    /**
     * 留뚯”?꾩“?ъ뿉 ????댁슜??議고쉶?쒕떎.
     *      
     * @param satisfactionVO
     * @return
     * @throws Exception
     */
    public Satisfaction selectSatisfaction(SatisfactionVO satisfactionVO) throws Exception;
    
    /**
     * 留뚯”?꾩“?ъ뿉 ????댁슜???섏젙?쒕떎.
     * 
     * @param satisfaction
     * @throws Exception
     */
    public void updateSatisfaction(Satisfaction satisfaction) throws Exception;
   
    /**
     * 留뚯”?꾩“???⑥뒪?뚮뱶瑜?媛?몄삩??
     * 
     * @param satisfaction
     * @return
     * @throws Exception
     */
    public String getSatisfactionPassword(Satisfaction satisfaction) throws Exception;
}
