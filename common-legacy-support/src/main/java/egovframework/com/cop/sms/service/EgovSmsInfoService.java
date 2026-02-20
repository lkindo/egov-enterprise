package egovframework.com.cop.sms.service;

import java.util.Map;

/**
 * ????? ??????????????
 * @author ?????? ????
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.06.18  ????         ????
 *
 * </pre>
 **/
public interface EgovSmsInfoService {
    /**
     * ?? ??????.
     * 
     * @param SmsVO
     **/
    public Map<String, Object> selectSmsInfs(SmsVO searchVO) throws Exception;
    
    /**
     * ?????(?)??.
     * 
     * @param sms
     * @throws Exception
     **/
    public void insertSmsInf(Sms sms) throws Exception;
    
    /**
     * ???????????????.
     * 
     * @param searchVO
     * @return
     * @throws Exception
     **/
    public SmsVO selectSmsInf(SmsVO searchVO) throws Exception;
    
    /**
     * ?? ????????.
     * 
     * @param smsConn
     * @return
     * @throws Exception
     **/
    public SmsConnection sendRequsest(SmsConnection smsConn) throws Exception;
    
    /**
     * ???????? ????????.
     * 
     * @param smsConn
     * @return
     * @throws Exception
     **/
    public SmsConnection[] sendRequsest(SmsConnection[] smsConn) throws Exception;
}
