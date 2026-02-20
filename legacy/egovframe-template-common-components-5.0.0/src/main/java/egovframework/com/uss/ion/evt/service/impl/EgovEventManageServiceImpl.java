package egovframework.com.uss.ion.evt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.evt.service.EgovEventManageService;
import egovframework.com.uss.ion.evt.service.EventAtdrn;
import egovframework.com.uss.ion.evt.service.EventManage;
import egovframework.com.uss.ion.evt.service.EventManageVO;
import egovframework.com.uss.ion.ism.service.EgovInfrmlSanctnService;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?됱궗愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?됱궗愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?됱궗愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 *
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 *
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >> *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------       --------    ---------------------------
 *  2011.8.11     ?뺤쭊??     Dependency 理쒖냼?붾? ?꾪븳 遺덊븘??蹂???좎뼵 二쇱꽍泥섎━
 *
 * </pre>
 */

@Service("egovEventManageService")
public class EgovEventManageServiceImpl extends EgovAbstractServiceImpl implements EgovEventManageService {

	@Resource(name="eventManageDAO")
    private EventManageDAO eventManageDAO;

    /** ID Generation */
	@Resource(name="egovEventManageIdGnrService")
	private EgovIdGnrService idgenEventService;

	@Resource(name="EgovInfrmlSanctnService")
    protected EgovInfrmlSanctnService infrmlSanctnService;

	/**
	 * ?됱궗愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???됱궗愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */
	@Override
	public List<EventManageVO> selectEventManageList(EventManageVO eventManageVO) throws Exception{

		List<EventManageVO> result = eventManageDAO.selectEventManageList(eventManageVO);
		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	EventManageVO eventManageVO1 = result.get(i);
	    	eventManageVO1.setEventBeginDe(EgovDateUtil.formatDate(eventManageVO1.getEventBeginDe(), "-"));
	    	eventManageVO1.setEventEndDe  (EgovDateUtil.formatDate(eventManageVO1.getEventEndDe()  , "-"));
	    	eventManageVO1.setRceptBeginDe(EgovDateUtil.formatDate(eventManageVO1.getRceptBeginDe(), "-"));
	    	eventManageVO1.setRceptEndDe  (EgovDateUtil.formatDate(eventManageVO1.getRceptEndDe()  , "-"));
	    	result.set(i, eventManageVO1);
	    }
		return result;
	}

	/**
	 * ?됱궗愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗愿由?移댁슫????
	 */
	@Override
	public int selectEventManageListTotCnt(EventManageVO eventManageVO) throws Exception {
		return eventManageDAO.selectEventManageListTotCnt(eventManageVO);
	}

	/**
	 * ?깅줉???됱궗愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return EventManageVO - ?됱궗愿由?VO
	 */
	@Override
	public EventManageVO selectEventManage(EventManageVO eventManageVO) throws Exception {
		return eventManageDAO.selectEventManage(eventManageVO);
	}

	/**
	 * ?됱궗愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	@Override
	public void insertEventManage(EventManage eventManage) throws Exception {
		eventManage.setEventBeginDe(EgovStringUtil.removeMinusChar(eventManage.getEventBeginDe()));
		eventManage.setEventEndDe  (EgovStringUtil.removeMinusChar(eventManage.getEventEndDe()  ));
		eventManage.setRceptBeginDe(EgovStringUtil.removeMinusChar(eventManage.getRceptBeginDe()));
		eventManage.setRceptEndDe  (EgovStringUtil.removeMinusChar(eventManage.getRceptEndDe()  ));

		String	sEventId = idgenEventService.getNextStringId();
		eventManage.setEventId(sEventId);
		eventManageDAO.insertEventManage(eventManage);
	}

	/**
	 * 湲??깅줉???됱궗愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	@Override
	public void updtEventManage(EventManage eventManage) throws Exception {
		eventManage.setEventBeginDe(EgovStringUtil.removeMinusChar(eventManage.getEventBeginDe()));
		eventManage.setEventEndDe  (EgovStringUtil.removeMinusChar(eventManage.getEventEndDe()  ));
		eventManage.setRceptBeginDe(EgovStringUtil.removeMinusChar(eventManage.getRceptBeginDe()));
		eventManage.setRceptEndDe  (EgovStringUtil.removeMinusChar(eventManage.getRceptEndDe()  ));
		eventManageDAO.updtEventManage(eventManage);
	}

	/**
	 * 湲??깅줉???됱궗愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	@Override
	public void deleteEventManage(EventManage eventManage) throws Exception {
		eventManageDAO.deleteEventManage(eventManage);
	}

/***  ?됱궗?묒닔愿由? ****/
	/**
	 * ?됱궗?묒닔愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???됱궗?묒닔愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗?묒닔愿由?紐⑸줉
	 */
	@Override
	public List<EventManageVO> selectEventAtdrnList(EventManageVO eventManageVO) throws Exception{
		List<EventManageVO> result = eventManageDAO.selectEventAtdrnList(eventManageVO);
		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	EventManageVO eventManageVO1 = result.get(i);
	    	eventManageVO1.setEventBeginDe(EgovDateUtil.formatDate(eventManageVO1.getEventBeginDe(), "-"));
	    	eventManageVO1.setEventEndDe  (EgovDateUtil.formatDate(eventManageVO1.getEventEndDe()  , "-"));
	    	eventManageVO1.setRceptBeginDe(EgovDateUtil.formatDate(eventManageVO1.getRceptBeginDe(), "-"));
	    	eventManageVO1.setRceptEndDe  (EgovDateUtil.formatDate(eventManageVO1.getRceptEndDe()  , "-"));
	    	result.set(i, eventManageVO1);
	    }
		return result;
	}

	/**
	 * ?됱궗?묒닔愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗?묒닔愿由?移댁슫????
	 */
	@Override
	public int selectEventAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception {
		return eventManageDAO.selectEventAtdrnListTotCnt(eventManageVO);
	}

	/**
	 * ?됱궗?묒닔?뱀씤/諛섎젮 泥섎━瑜??꾪빐 ?깅줉???됱궗?묒닔 紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗?묒닔?뱀씤 紐⑸줉
	 */
	@Override
	public List<EventManageVO> selectEventRceptConfmList(EventManageVO eventManageVO) throws Exception{
		List<EventManageVO> result = eventManageDAO.selectEventRceptConfmList(eventManageVO);
		int num = result.size();

	    for (int i = 0 ; i < num ; i ++ ){
	    	EventManageVO eventManageVO1 = result.get(i);
	    	eventManageVO1.setEventBeginDe(EgovDateUtil.formatDate(eventManageVO1.getEventBeginDe(), "-"));
	    	eventManageVO1.setEventEndDe  (EgovDateUtil.formatDate(eventManageVO1.getEventEndDe()  , "-"));
	    	result.set(i, eventManageVO1);
	    }
		return result;
	}

	/**
	 * ?됱궗?묒닔?뱀씤/諛섎젮 泥섎━瑜??꾪빐 ?깅줉???됱궗?묒닔 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗?묒닔?뱀씤 移댁슫????
	 */
	@Override
	public int selectEventRceptConfmListTotCnt(EventManageVO eventManageVO) throws Exception {
		return eventManageDAO.selectEventRceptConfmListTotCnt(eventManageVO);
	}

	/**
	 * ?됱궗?쇱옄, ?됱궗援щ텇 議곌굔???곕Ⅸ ?됱궗紐?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗紐?紐⑸줉
	 */
	@Override
	public List<EventManageVO> selectEventNmList(EventManageVO eventManageVO) throws Exception{
		List<EventManageVO> result = eventManageDAO.selectEventNmList(eventManageVO);
		return result;
	}


	/**
	 * ?깅줉???됱궗?묒닔愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return EventManageVO - ?됱궗愿由?VO
	 */
	@Override
	public EventManageVO selectEventAtdrn(EventManageVO eventManageVO) throws Exception {
		return eventManageDAO.selectEventAtdrn(eventManageVO);
	}

	/**
	 * ?됱궗?묒닔愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param eventManage - ?됱궗?묒닔愿由?model
	 */
	@Override
	public void insertEventAtdrn(EventAtdrn eventAtdrn) throws Exception {

		/*
		 * ?됱궗?묒닔 ?뱀씤泥섎━  ?좎껌 infrmlSanctnService.insertInfrmlSanctn("000", vcatnManage);
		 */
		InfrmlSanctn infrmlSanctn = infrmlSanctnService.insertInfrmlSanctn(converToInfrmlSanctnObject(eventAtdrn)); //?좎껌
		//InfrmlSanctn infrmlSanctn = infrmlSanctnService.insertInfrmlSanctn("004", eventAtdrn);
		eventAtdrn.setInfrmlSanctnId(infrmlSanctn.getInfrmlSanctnId());
		eventAtdrn.setConfmAt(infrmlSanctn.getConfmAt());
		eventManageDAO.insertEventAtdrn(eventAtdrn);
	}

	/**
	 * 湲??깅줉???됱궗?묒닔愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param eventManage - ?됱궗?묒닔愿由?model
	 */
	@Override
	public void deleteEventAtdrn(EventAtdrn eventAtdrn) throws Exception {
		eventAtdrn.setReqstDe(EgovStringUtil.removeMinusChar(eventAtdrn.getReqstDe()));
		/*
		 * ?됱궗?묒닔 ?뱀씤泥섎━  ??젣
		 */
		infrmlSanctnService.deleteInfrmlSanctn(converToInfrmlSanctnObject(eventAtdrn));  //??젣
		eventManageDAO.deleteEventAtdrn(eventAtdrn);
	}

	/**
	 * 湲??깅줉???됱궗?묒닔愿由ъ젙蹂대? ?뱀씤/諛섎젮泥섎━?쒕떎.
	 * @param eventManage - ?됱궗?묒닔愿由?model
	 * @param String      - ?뱀씤/諛섎젮?뺣낫
	 */
	@Override
	public void updtEventAtdrn(EventAtdrn eventAtdrn, String checkedEventRceptForConfm) throws Exception {

		//MtgPlaceFxtrs mtgPlaceFxtrs;	// 2011.8.11 ?섏젙遺?mtg(?뚯쓽?ㅺ?由?而댄룷?뚰듃)????섏〈???쒓굅
		//int insertCnt    = 0;			// 2011.8.11 ?섏젙遺?
		String [] eventRceptValues = checkedEventRceptForConfm.split("[$]");
		String [] sTempEventRcept;
		String    sTemp=null;
		for (String eventRceptValue : eventRceptValues) {
			sTemp = eventRceptValue;
			sTempEventRcept = sTemp.split(",");
			eventAtdrn.setEventId(sTempEventRcept[0]);
			eventAtdrn.setApplcntId(sTempEventRcept[1]);
			eventAtdrn.setInfrmlSanctnId(sTempEventRcept[2]);
			eventAtdrn.setReqstDe(sTempEventRcept[3]);
 		    InfrmlSanctn infrmlSanctn = new InfrmlSanctn();

			if(eventAtdrn.getConfmAt().equals("C")){
				/*
				 * ?뱀씤泥섎━
				 */
				infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnConfm(converToInfrmlSanctnObject(eventAtdrn));  //?뱀씤
				//infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnConfm("004", eventAtdrn);
			}else if(eventAtdrn.getConfmAt().equals("R")){
				/*
				 * 諛섎젮泥섎━
				 */
				infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnReturn(converToInfrmlSanctnObject(eventAtdrn));  //諛섎젮
				//infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnReturn("004", eventAtdrn);
			}
			eventAtdrn.setSanctnDt(infrmlSanctn.getSanctnDt());
			eventAtdrn.setConfmAt(infrmlSanctn.getConfmAt());

			eventManageDAO.updtEventAtdrn(eventAtdrn);
		}
	}

	/**
	 * ?됱궗?묒닔???뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */
	@Override
	public List<EventManageVO> selectEventReqstAtdrnList(EventManageVO eventManageVO) throws Exception{
		return eventManageDAO.selectEventReqstAtdrnList(eventManageVO);
	}

	/**
	 * ?됱궗?묒닔??紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗愿由?移댁슫????
	 */
	@Override
	public int selectEventReqstAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception {
		return eventManageDAO.selectEventReqstAtdrnListTotCnt(eventManageVO);
	}

	/**
	 * CtsnnManage model??InfrmlSanctn model濡?蹂?섑븳??
	 * @param CtsnnManage
	 * @return InfrmlSanctn
	 */
	private InfrmlSanctn converToInfrmlSanctnObject(EventAtdrn eventAtdrn) throws Exception{
		InfrmlSanctn infrmlSanctn = new InfrmlSanctn();
    	infrmlSanctn.setJobSeCode("004");								// ?낅Т援щ텇肄붾뱶 (怨듯넻肄붾뱶 COM75)
    	infrmlSanctn.setApplcntId(eventAtdrn.getApplcntId());			    // ?ъ슜?륤D
    	infrmlSanctn.setReqstDe(eventAtdrn.getReqstDe());				// ?좎껌?쇱옄
    	infrmlSanctn.setSanctnerId(eventAtdrn.getSanctnerId());		// 寃곗옱?륤D
    	infrmlSanctn.setConfmAt(eventAtdrn.getConfmAt());				// ?뱀씤援щ텇
    	infrmlSanctn.setSanctnDt(eventAtdrn.getSanctnDt());			// 寃곗옱?쇱떆
    	infrmlSanctn.setReturnResn(eventAtdrn.getReturnResn());		// 諛섎젮?ъ쑀
    	infrmlSanctn.setFrstRegisterId(eventAtdrn.getFrstRegisterId());
    	infrmlSanctn.setFrstRegisterPnttm(eventAtdrn.getFrstRegisterId());
    	infrmlSanctn.setLastUpdusrId(eventAtdrn.getLastUpdusrId());
    	infrmlSanctn.setLastUpdusrPnttm(eventAtdrn.getLastUpdusrPnttm());
    	infrmlSanctn.setInfrmlSanctnId(eventAtdrn.getInfrmlSanctnId());// ?쎌떇寃곗옱ID
    	return infrmlSanctn;
	}

}
