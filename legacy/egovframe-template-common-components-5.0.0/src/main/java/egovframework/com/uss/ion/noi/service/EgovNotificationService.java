package egovframework.com.uss.ion.noi.service;

import java.util.List;
import java.util.Map;

/**
 * ?뺣낫?뚮┝?대? ?꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.08
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.6.8  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovNotificationService {
    /**
     * ?뺣낫?뚮┝??紐⑸줉??議고쉶 ?쒕떎.
     * 
     * @param BoardMasterVO
     */
    public Map<String, Object> selectNotificationInfs(NotificationVO searchVO) throws Exception;
    
    /**
     * ?뺣낫?뚮┝???뺣낫瑜??깅줉?쒕떎.
     * 
     * @param notification
     * @throws Exception
     */
    public void insertNotificationInf(Notification notification) throws Exception;
    
    /**
     * ?뺣낫?뚮┝?댁뿉 ????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param searchVO
     * @return
     * @throws Exception
     */
    public NotificationVO selectNotificationInf(NotificationVO searchVO) throws Exception;
    
    /**
     * ?뺣낫?뚮┝???뺣낫瑜??섏젙?쒕떎.
     * 
     * @param notification
     * @throws Exception
     */
    public void updateNotifictionInf(Notification notification) throws Exception;
    
    /**
     * ?뺣낫?뚮┝???뺣낫瑜???젣?쒕떎.
     * 
     * @param notification
     * @throws Exception
     */
    public void deleteNotifictionInf(Notification notification) throws Exception;
    
    /**
     * ?뺣낫?뚮┝???뚮┝?쒓컙 ?깆뿉 ????먭????섑뻾?쒕떎.
     * 
     * @param notification
     * @return
     * @throws Exception
     */
    public boolean checkNotification(Notification notification) throws Exception;
    
    /**
     * ?뺣낫?뚮┝???뺣낫 ?쒖떆瑜??섑뻾?쒕떎.
     * 
     * @return
     * @throws Exception
     */
    public List<NotificationVO> selectNotificationData() throws Exception;
}
