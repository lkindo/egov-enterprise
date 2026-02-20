package egovframework.com.uss.ion.noi.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.noi.service.Notification;
import egovframework.com.uss.ion.noi.service.NotificationVO;

/**
 * ?뺣낫?뚮┝?대? ?꾪븳 ?곗씠???묎렐 ?대옒??
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
 *   2009.06.08  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("NotificationDAO")
public class NotificationDAO extends EgovComAbstractDAO {
    /**
     * ?뺣낫?뚮┝??紐⑸줉??議고쉶?쒕떎.
     * 
     * @param NotificationVO
     */
    public List<NotificationVO> selectNotificationInfs(NotificationVO vo) throws Exception {
	return selectList("NotificationDAO.selectNotificationInfs", vo);
    }

    /**
     * ?뺣낫?뚮┝??紐⑸줉 ?レ옄瑜?議고쉶?쒕떎
     * 
     * @param vo
     * @return
     * @throws Exception
     */
    public int selectNotificationInfsCnt(NotificationVO vo) throws Exception {
	return (Integer)selectOne("NotificationDAO.selectNotificationInfsCnt", vo);
    }
    
    /**
     * ?뺣낫?뚮┝???뺣낫瑜??깅줉?쒕떎.
     * 
     * @param notification
     * @return
     * @throws Exception
     */
    public String insertNotificationInf(Notification notification) throws Exception {
	return Integer.toString(insert("NotificationDAO.insertNotificationInf", notification));
    }
    
    /**
     * ?뺣낫?뚮┝?댁뿉 ????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     * 
     * @param searchVO
     * @return
     */
    public NotificationVO selectNotificationInf(NotificationVO searchVO) {
	return (NotificationVO)selectOne("NotificationDAO.selectNotificationInf", searchVO);
    }
    
    /**
     * ?뺣낫?뚮┝???뺣낫瑜??섏젙?쒕떎.
     * 
     * @param notification
     * @return
     * @throws Exception
     */
    public void updateNotificationInf(Notification notification) throws Exception {
	update("NotificationDAO.updateNotificationInf", notification);
    }
    
    /**
     * ?뺣낫?뚮┝???뺣낫瑜???젣?쒕떎.
     * 
     * @param notification
     * @throws Exception
     */
    public void deleteNotificationInf(Notification notification) throws Exception {
	update("NotificationDAO.deleteNotificationInf", notification);
    }
    
    /**
     * ?뺣낫?뚮┝???쒖떆瑜??꾪븳 ????뚮┝ ?뺣낫瑜??삳뒗??
     * 
     * @param vo
     * @return
     * @throws Exception
     */
    public List<NotificationVO> getNotificationData(NotificationVO vo) throws Exception {
	return selectList("NotificationDAO.getNotificationData", vo);
    }
}
