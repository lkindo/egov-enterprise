package egovframework.com.cop.sms.service;

import java.util.Map;

/**
 * 臾몄옄硫붿떆吏瑜??꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.18  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovSmsInfoService {
    /**
     * 臾몄옄硫붿떆吏 紐⑸줉??議고쉶 ?쒕떎.
     * 
     * @param SmsVO
     */
    public Map<String, Object> selectSmsInfs(SmsVO searchVO) throws Exception;
    
    /**
     * 臾몄옄硫붿떆吏瑜??꾩넚(?깅줉)?쒕떎.
     * 
     * @param sms
     * @throws Exception
     */
    public void insertSmsInf(Sms sms) throws Exception;
    
    /**
     * 臾몄옄硫붿떆吏??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param searchVO
     * @return
     * @throws Exception
     */
    public SmsVO selectSmsInf(SmsVO searchVO) throws Exception;
    
    /**
     * 臾몄옄硫붿떆吏 ???꾩넚???붿껌?쒕떎.
     * 
     * @param smsConn
     * @return
     * @throws Exception
     */
    public SmsConnection sendRequsest(SmsConnection smsConn) throws Exception;
    
    /**
     * ?щ윭 嫄댁쓽 臾몄옄硫붿떆吏 ???꾩넚???붿껌?쒕떎.
     * 
     * @param smsConn
     * @return
     * @throws Exception
     */
    public SmsConnection[] sendRequsest(SmsConnection[] smsConn) throws Exception;
}
