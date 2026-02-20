package egovframework.com.cop.bbs.service;

import java.util.Map;

/**
 * ????? ? ??????????????
 * @author ?????? ????
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.06.29  ????         ????
 *
 * </pre>
 **/
public interface EgovBBSSatisfactionService {
    /**
     * ??????????????????.
     * 
     * @param bbsId
     * @return
     * @throws Exception
     **/
    public boolean canUseSatisfaction(String bbsId) throws Exception;
    
    /**
     * ???????????????.
     * 
     * @param satisfactionVO
     * @return
     * @throws Exception
     **/
    public Map<String, Object> selectSatisfactionList(SatisfactionVO satisfactionVO) throws Exception;
    
    /**
     * ????? ???.
     * 
     * @param satisfaction
     * @throws Exception
     **/
    public void insertSatisfaction(Satisfaction satisfaction) throws Exception;
    
    /**
     * ????? ?????.
     * 
     * @param satisfactionVO
     * @throws Exception
     **/
    public void deleteSatisfaction(SatisfactionVO satisfactionVO) throws Exception;
    
    /**
     * ????????????????.
     *      
     * @param satisfactionVO
     * @return
     * @throws Exception
     **/
    public Satisfaction selectSatisfaction(SatisfactionVO satisfactionVO) throws Exception;
    
    /**
     * ?????????????????.
     * 
     * @param satisfaction
     * @throws Exception
     **/
    public void updateSatisfaction(Satisfaction satisfaction) throws Exception;
   
    /**
     * ??????????????
     * 
     * @param satisfaction
     * @return
     * @throws Exception
     **/
    public String getSatisfactionPassword(Satisfaction satisfaction) throws Exception;
}
