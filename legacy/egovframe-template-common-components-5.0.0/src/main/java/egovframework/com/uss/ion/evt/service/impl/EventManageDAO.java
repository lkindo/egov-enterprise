package egovframework.com.uss.ion.evt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.evt.service.EventAtdrn;
import egovframework.com.uss.ion.evt.service.EventManage;
import egovframework.com.uss.ion.evt.service.EventManageVO;

/**
 * 媛쒖슂
 * - ?됱궗愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?됱궗愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?됱궗愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

@Repository("eventManageDAO")
public class EventManageDAO extends EgovComAbstractDAO {

	/**
	 * ?됱궗愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???됱궗愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */	
	public List<EventManageVO> selectEventManageList(EventManageVO eventManageVO) throws Exception {
		return selectList("eventManageDAO.selectEventManageList", eventManageVO);
	}

    /**
	 * ?됱궗愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectEventManageListTotCnt(EventManageVO eventManageVO) throws Exception {
        return (Integer)selectOne("eventManageDAO.selectEventManageListTotCnt", eventManageVO);
    }

	/**
	 * ?깅줉???됱궗愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return EventManageVO - ?됱궗愿由?VO
	 */
	public EventManageVO selectEventManage(EventManageVO eventManageVO)  throws Exception {
		return (EventManageVO) selectOne("eventManageDAO.selectEventManage", eventManageVO);
	}

	/**
	 * ?됱궗愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void insertEventManage(EventManage eventManage) throws Exception {
		insert("eventManageDAO.insertEventManage", eventManage);
	}

	/**
	 * 湲??깅줉???됱궗愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void updtEventManage(EventManage eventManage) throws Exception {
		update("eventManageDAO.updateEventManage", eventManage);
	}

	/**
	 * 湲??깅줉???됱궗愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void deleteEventManage(EventManage eventManage) throws Exception {
        delete("eventManageDAO.deleteEventManage",eventManage);
	}

	
	/** ?됱궗?묒닔愿由?***/
	/**
	 * ?됱궗?묒닔?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???됱궗愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */	
	public List<EventManageVO> selectEventAtdrnList(EventManageVO eventManageVO) throws Exception {
		return selectList("eventManageDAO.selectEventAtdrnList", eventManageVO);
	}

    /**
	 * ?됱궗?묒닔愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectEventAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception {
        return (Integer)selectOne("eventManageDAO.selectEventAtdrnListTotCnt", eventManageVO);
    }

	/**
	 * ?됱궗?묒닔?뱀씤/諛섎젮 泥섎━瑜??꾪빐 ?깅줉???됱궗?묒닔 紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */	
	public List<EventManageVO> selectEventRceptConfmList(EventManageVO eventManageVO) throws Exception {
		return selectList("eventManageDAO.selectEventRceptConfmList", eventManageVO);
	}

    /**
	 * ?됱궗?묒닔?뱀씤/諛섎젮 泥섎━瑜??꾪빐 ?깅줉???됱궗?묒닔 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectEventRceptConfmListTotCnt(EventManageVO eventManageVO) throws Exception {
        return (Integer)selectOne("eventManageDAO.selectEventRceptConfmListTotCnt", eventManageVO);
    }

	/**
	 * ?됱궗?쇱옄, ?됱궗援щ텇 議곌굔???곕Ⅸ ?됱궗紐?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */
	public List<EventManageVO> selectEventNmList(EventManageVO eventManageVO) throws Exception {
		return selectList("eventManageDAO.selectEventNmList", eventManageVO);
	}
    
	/**
	 * ?깅줉???됱궗?묒닔愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return EventManageVO - ?됱궗愿由?VO
	 */
	public EventManageVO selectEventAtdrn(EventManageVO eventManageVO)  throws Exception {
		return (EventManageVO) selectOne("eventManageDAO.selectEventAtdrn", eventManageVO);
	}

	/**
	 * ?됱궗?묒닔愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void insertEventAtdrn(EventAtdrn eventAtdrn) throws Exception {
		insert("eventManageDAO.insertEventAtdrn", eventAtdrn);
	}

	/**
	 * 湲??깅줉???됱궗?묒닔愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void deleteEventAtdrn(EventAtdrn eventAtdrn) throws Exception {
        delete("eventManageDAO.deleteEventAtdrn",eventAtdrn);
	}

	/**
	 * 湲??깅줉???됱궗?묒닔愿由ъ젙蹂대? ?뱀씤泥섎━?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void updtEventAtdrn(EventAtdrn eventAtdrn) throws Exception {
		update("eventManageDAO.updtEventAtdrn", eventAtdrn);
	}

	
	/**
	 * ?됱궗?묒닔???뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */
	
	public List<EventManageVO> selectEventReqstAtdrnList(EventManageVO eventManageVO) throws Exception {
		return selectList("eventManageDAO.selectEventReqstAtdrnList", eventManageVO);
	}

    /**
	 * ?됱궗?묒닔??紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectEventReqstAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception {
        return (Integer)selectOne("eventManageDAO.selectEventReqstAtdrnListTotCnt", eventManageVO);
    }
	
}
