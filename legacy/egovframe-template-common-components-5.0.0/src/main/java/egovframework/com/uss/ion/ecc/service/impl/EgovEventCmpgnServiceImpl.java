package egovframework.com.uss.ion.ecc.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.ecc.service.EgovEventCmpgnService;
import egovframework.com.uss.ion.ecc.service.EventCmpgnVO;
import egovframework.com.uss.ion.ecc.service.TnextrlHrVO;
import jakarta.annotation.Resource;

@Service("EgovEventCmpgnService")
public class EgovEventCmpgnServiceImpl extends EgovAbstractServiceImpl implements EgovEventCmpgnService {

	@Resource(name="EgovEventCmpgnDAO")
	private EgovEventCmpgnDAO egovEventCmpgnDao;

	@Resource(name="egovEventInfoIdGnrService")
	private EgovIdGnrService idgenService1;

	@Resource(name="egovExtrlhrInfoIdGnrService")
	private EgovIdGnrService idgenService2;

	@Override
	public List<EventCmpgnVO> selectEventCmpgnList(EventCmpgnVO searchVO) {
		return egovEventCmpgnDao.selectEventCmpgnList(searchVO);
	}

	@Override
	public int selectEventCmpgnListCnt(EventCmpgnVO searchVO) {
		return egovEventCmpgnDao.selectEventCmpgnListCnt(searchVO);
	}

	@Override
	public void insertEventCmpgn(EventCmpgnVO eventCmpgnVO) throws FdlException {
		String eventId = idgenService1.getNextStringId();
		eventCmpgnVO.setEventId(eventId);

		egovEventCmpgnDao.insertEventCmpgn(eventCmpgnVO);
	}

	@Override
	public EventCmpgnVO selectEventCmpgnDetail(EventCmpgnVO eventCmpgnVO) throws Exception {
		EventCmpgnVO resultVO = egovEventCmpgnDao.selectEventCmpgnDetail(eventCmpgnVO);
        if (resultVO == null) {
			throw processException("info.nodata.msg");
		}
        return resultVO;
	}

	@Override
	public void updateEventCmpgn(EventCmpgnVO eventCmpgnVO) {
		egovEventCmpgnDao.updateEventCmpgn(eventCmpgnVO);
	}

	@Override
	public void deleteEventCmpgn(EventCmpgnVO eventCmpgnVO) {
		//?됱궗/?대깽??罹좏럹?몄뿉 ?랁븳 ?몃??몄궗?뺣낫瑜???젣?쒕떎.
		egovEventCmpgnDao.deleteEventCmpgnTnextrlHr(eventCmpgnVO);

		//?됱궗/?대깽??罹좏럹?몄쓣 ??젣?쒕떎.
		egovEventCmpgnDao.deleteEventCmpgn(eventCmpgnVO);

	}

	@Override
	public List<TnextrlHrVO> selectTnextrlHrList(TnextrlHrVO searchVO) {
		return egovEventCmpgnDao.selectTnextrlHrList(searchVO);
	}

	@Override
	public int selectTnextrlHrListCnt(TnextrlHrVO searchVO) {
		return egovEventCmpgnDao.selectTnextrlHrListCnt(searchVO);
	}

	@Override
	public void insertTnextrlHr(TnextrlHrVO tnextrlHrVO) throws FdlException {
		String extrlHrId = idgenService2.getNextStringId();
		tnextrlHrVO.setExtrlHrId(extrlHrId);

		egovEventCmpgnDao.insertTnextrlHr(tnextrlHrVO);
	}

	@Override
	public TnextrlHrVO selectTnextrlHrDetail(TnextrlHrVO tnextrlHrVO) throws Exception {
		TnextrlHrVO resultVO = egovEventCmpgnDao.selectTnextrlHrDetail(tnextrlHrVO);
        if (resultVO == null) {
			throw processException("info.nodata.msg");
		}
        return resultVO;
	}

	@Override
	public void updateTnextrlHr(TnextrlHrVO tnextrlHrVO) {
		egovEventCmpgnDao.updateTnextrlHr(tnextrlHrVO);
	}

	@Override
	public void deleteTnextrlHr(TnextrlHrVO tnextrlHrVO) {
		egovEventCmpgnDao.deleteTnextrlHr(tnextrlHrVO);
	}

}
