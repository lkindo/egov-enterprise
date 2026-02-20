package egovframework.com.uss.ion.noi.service;

import java.util.List;
import java.util.Map;

/**
 * ??????? ? ??????????????
 * @author ?????? ????
 * @since 2009.06.08
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.6.8  ????         ????
 *
 * </pre>
 **/
public interface EgovNotificationService {
    /**
     * ????????????.
     * 
     * @param BoardMasterVO
     **/
    public Map<String, Object> selectNotificationInfs(NotificationVO searchVO) throws Exception;
    
    /**
     * ????????????.
     * 
     * @param notification
     * @throws Exception
     **/
    public void insertNotificationInf(Notification notification) throws Exception;
    
    /**
     * ?????? ???????????.
     * 
     * @param searchVO
     * @return
     * @throws Exception
     **/
    public NotificationVO selectNotificationInf(NotificationVO searchVO) throws Exception;
    
    /**
     * ?????????????.
     * 
     * @param notification
     * @throws Exception
     **/
    public void updateNotifictionInf(Notification notification) throws Exception;
    
    /**
     * ??????????????.
     * 
     * @param notification
     * @throws Exception
     **/
    public void deleteNotifictionInf(Notification notification) throws Exception;
    
    /**
     * ??????????? ? ????????????.
     * 
     * @param notification
     * @return
     * @throws Exception
     **/
    public boolean checkNotification(Notification notification) throws Exception;
    
    /**
     * ??????? ????????.
     * 
     * @return
     * @throws Exception
     **/
    public List<NotificationVO> selectNotificationData() throws Exception;
}
