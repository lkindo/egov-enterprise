package egovframework.com.uss.ion.ecc.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.notification.EventCmpgn;
import com.company.project.domain.notification.EventCmpgnRepository;
import com.company.project.domain.notification.ExtrlHr;
import com.company.project.domain.notification.ExtrlHrRepository;

import egovframework.com.uss.ion.ecc.service.EgovEventCmpgnService;
import egovframework.com.uss.ion.ecc.service.EventCmpgnVO;
import egovframework.com.uss.ion.ecc.service.TnextrlHrVO;
import jakarta.annotation.Resource;

@Service("egovEventCmpgnService")
public class EgovEventCmpgnServiceImpl extends EgovAbstractServiceImpl implements EgovEventCmpgnService {

	@Resource(name = "notificationEventCmpgnRepository")
	private EventCmpgnRepository eventCmpgnRepository;

	@Resource(name = "extrlHrRepository")
	private ExtrlHrRepository extrlHrRepository;

	@Resource(name = "egovEventCmpgnIdGnrService")
	private EgovIdGnrService idgenService;

	@Resource(name = "egovExtrlHrIdGnrService")
	private EgovIdGnrService idgenExtrlHrService;

	@Override
	public List<EventCmpgnVO> selectEventCmpgnList(EventCmpgnVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<EventCmpgn> page = eventCmpgnRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectEventCmpgnListCnt(EventCmpgnVO searchVO) {
		return (int) eventCmpgnRepository.count();
	}

	@Override
	public EventCmpgnVO selectEventCmpgnDetail(EventCmpgnVO searchVO) throws Exception {
		return eventCmpgnRepository.findById(searchVO.getEventId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertEventCmpgn(EventCmpgnVO searchVO) throws org.egovframe.rte.fdl.cmmn.exception.FdlException {
		try {
			String id = idgenService.getNextStringId();
			searchVO.setEventId(id);

			EventCmpgn entity = EventCmpgn.builder()
					.eventId(id)
					.eventSvcBeginDe(searchVO.getEventSvcBeginDe())
					.svcUseNmprCo(searchVO.getSvcUseNmprCo())
					.chargerNm(searchVO.getChargerNm())
					.eventCn(searchVO.getEventCn())
					.eventSvcEndDe(searchVO.getEventSvcEndDe())
					.eventTyCode(searchVO.getEventTyCode())
					.prparetgCn(searchVO.getPrparetgCn())
					.eventConfmAt(searchVO.getEventConfmAt())
					.eventConfmDe(searchVO.getEventConfmDe())
					.frstRegisterId(searchVO.getFrstRegisterId())
					.build();

			eventCmpgnRepository.save(entity);
		} catch (Exception e) {
			throw new org.egovframe.rte.fdl.cmmn.exception.FdlException("insertEventCmpgn error", e);
		}
	}

	@Override
	public void updateEventCmpgn(EventCmpgnVO searchVO) {
		eventCmpgnRepository.findById(searchVO.getEventId()).ifPresent(entity -> {
			entity.update(
					searchVO.getEventSvcBeginDe(),
					searchVO.getSvcUseNmprCo(),
					searchVO.getChargerNm(),
					searchVO.getEventCn(),
					searchVO.getEventSvcEndDe(),
					searchVO.getEventTyCode(),
					searchVO.getPrparetgCn(),
					searchVO.getEventConfmAt(),
					searchVO.getEventConfmDe(),
					searchVO.getLastUpdusrId());
			eventCmpgnRepository.save(entity);
		});
	}

	@Override
	@Transactional
	public void deleteEventCmpgn(EventCmpgnVO searchVO) {
		extrlHrRepository.deleteByEventId(searchVO.getEventId());
		eventCmpgnRepository.deleteById(searchVO.getEventId());
	}

	@Override
	public List<TnextrlHrVO> selectTnextrlHrList(TnextrlHrVO searchVO) {
		if (searchVO.getEventId() != null) {
			return extrlHrRepository.findByEventId(searchVO.getEventId()).stream()
					.map(this::toExtrlHrVO)
					.collect(Collectors.toList());
		}
		return extrlHrRepository.findAll().stream().map(this::toExtrlHrVO).collect(Collectors.toList());
	}

	@Override
	public int selectTnextrlHrListCnt(TnextrlHrVO searchVO) {
		if (searchVO.getEventId() != null) {
			return (int) extrlHrRepository.findByEventId(searchVO.getEventId()).size();
		}
		return (int) extrlHrRepository.count();
	}

	@Override
	public TnextrlHrVO selectTnextrlHrDetail(TnextrlHrVO searchVO) throws Exception {
		return extrlHrRepository.findById(searchVO.getExtrlHrId())
				.map(this::toExtrlHrVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertTnextrlHr(TnextrlHrVO searchVO) throws org.egovframe.rte.fdl.cmmn.exception.FdlException {
		try {
			String id = idgenExtrlHrService.getNextStringId();
			searchVO.setExtrlHrId(id);

			ExtrlHr entity = ExtrlHr.builder()
					.extrlHrId(id)
					.eventId(searchVO.getEventId())
					.sexdstnCode(searchVO.getSexdstnCode())
					.extrlHrNm(searchVO.getExtrlHrNm())
					.areaNo(searchVO.getAreaNo())
					.middleTelno(searchVO.getMiddleTelno())
					.endTelno(searchVO.getEndTelno())
					.emailAdres(searchVO.getEmailAdres())
					.occpTyCode(searchVO.getOccpTyCode())
					.brth(searchVO.getBrth())
					.psitnInsttNm(searchVO.getPsitnInsttNm())
					.frstRegisterId(searchVO.getFrstRegisterId())
					.build();

			extrlHrRepository.save(entity);
		} catch (Exception e) {
			throw new org.egovframe.rte.fdl.cmmn.exception.FdlException("insertTnextrlHr error", e);
		}
	}

	@Override
	public void updateTnextrlHr(TnextrlHrVO searchVO) {
		extrlHrRepository.findById(searchVO.getExtrlHrId()).ifPresent(entity -> {
			entity.update(
					searchVO.getSexdstnCode(),
					searchVO.getExtrlHrNm(),
					searchVO.getAreaNo(),
					searchVO.getMiddleTelno(),
					searchVO.getEndTelno(),
					searchVO.getEmailAdres(),
					searchVO.getOccpTyCode(),
					searchVO.getBrth(),
					searchVO.getPsitnInsttNm(),
					searchVO.getLastUpdusrId());
			extrlHrRepository.save(entity);
		});
	}

	@Override
	public void deleteTnextrlHr(TnextrlHrVO searchVO) {
		extrlHrRepository.deleteById(searchVO.getExtrlHrId());
	}

	private EventCmpgnVO toVO(EventCmpgn entity) {
		EventCmpgnVO vo = new EventCmpgnVO();
		vo.setEventId(entity.getEventId());
		vo.setEventSvcBeginDe(entity.getEventSvcBeginDe());
		vo.setSvcUseNmprCo(entity.getSvcUseNmprCo());
		vo.setChargerNm(entity.getChargerNm());
		vo.setEventCn(entity.getEventCn());
		vo.setEventSvcEndDe(entity.getEventSvcEndDe());
		vo.setEventTyCode(entity.getEventTyCode());
		vo.setPrparetgCn(entity.getPrparetgCn());
		vo.setEventConfmAt(entity.getEventConfmAt());
		vo.setEventConfmDe(entity.getEventConfmDe());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		if (entity.getLastUpdusrPnttm() != null) {
			vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm().toString());
		}
		return vo;
	}

	private TnextrlHrVO toExtrlHrVO(ExtrlHr entity) {
		TnextrlHrVO vo = new TnextrlHrVO();
		vo.setExtrlHrId(entity.getExtrlHrId());
		vo.setEventId(entity.getEventId());
		vo.setSexdstnCode(entity.getSexdstnCode());
		vo.setExtrlHrNm(entity.getExtrlHrNm());
		vo.setAreaNo(entity.getAreaNo());
		vo.setMiddleTelno(entity.getMiddleTelno());
		vo.setEndTelno(entity.getEndTelno());
		vo.setEmailAdres(entity.getEmailAdres());
		vo.setOccpTyCode(entity.getOccpTyCode());
		vo.setBrth(entity.getBrth());
		vo.setPsitnInsttNm(entity.getPsitnInsttNm());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		if (entity.getLastUpdusrPnttm() != null) {
			vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm().toString());
		}
		return vo;
	}
}
