package egovframework.com.uss.ion.evt.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.event.EventAttendance;
import com.company.project.domain.event.EventAttendanceRepository;
import com.company.project.domain.event.EventRepository;

import egovframework.com.uss.ion.evt.service.EgovEventManageService;
import egovframework.com.uss.ion.evt.service.EventAtdrn;
import egovframework.com.uss.ion.evt.service.EventManage;
import egovframework.com.uss.ion.evt.service.EventManageVO;
import jakarta.annotation.Resource;

@Service("egovEventManageService")
public class EgovEventManageServiceImpl extends EgovAbstractServiceImpl implements EgovEventManageService {

	@Resource(name = "eventRepository")
	private EventRepository eventRepository;

	@Resource(name = "eventAttendanceRepository")
	private EventAttendanceRepository eventAttendanceRepository;

	@Resource(name = "egovEventManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EventManageVO> selectEventManageList(EventManageVO eventManageVO) throws Exception {
		Pageable pageable = PageRequest.of(eventManageVO.getPageIndex() - 1, eventManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "eventBeginDe"));
		Page<com.company.project.domain.event.Event> page = eventRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectEventManageListTotCnt(EventManageVO eventManageVO) throws Exception {
		return (int) eventRepository.count();
	}

	@Override
	public EventManageVO selectEventManage(EventManageVO eventManageVO) throws Exception {
		return eventRepository.findById(eventManageVO.getEventId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertEventManage(EventManage eventManage) throws Exception {
		String id = idgenService.getNextStringId();
		com.company.project.domain.event.Event entity = com.company.project.domain.event.Event.builder()
				.eventId(id)
				.eventSe(eventManage.getEventSe())
				.eventNm(eventManage.getEventNm())
				.eventPurps(eventManage.getEventPurps())
				.eventBeginDe(eventManage.getEventBeginDe())
				.eventEndDe(eventManage.getEventEndDe())
				.eventAuspcInsttNm(eventManage.getEventAuspcInsttNm())
				.eventMngtInsttNm(eventManage.getEventMngtInsttNm())
				.eventPlace(eventManage.getEventPlace())
				.eventCn(eventManage.getEventCn())
				.ctOccrrncAt(eventManage.getCtOccrrncAt())
				.partcptCt(eventManage.getPartcptCt())
				.psncpa(eventManage.getPsncpa())
				.refrnUrl(eventManage.getRefrnUrl())
				.rceptBeginDe(eventManage.getRceptBeginDe())
				.rceptEndDe(eventManage.getRceptEndDe())
				.frstRegisterId(eventManage.getFrstRegisterId())
				.build();
		eventRepository.save(entity);
	}

	@Override
	public void updtEventManage(EventManage eventManage) throws Exception {
		eventRepository.findById(eventManage.getEventId()).ifPresent(entity -> {
			entity.update(eventManage.getEventSe(), eventManage.getEventNm(), eventManage.getEventPurps(),
					eventManage.getEventBeginDe(), eventManage.getEventEndDe(), eventManage.getEventAuspcInsttNm(),
					eventManage.getEventMngtInsttNm(), eventManage.getEventPlace(), eventManage.getEventCn(),
					eventManage.getCtOccrrncAt(), eventManage.getPartcptCt(), eventManage.getPsncpa(),
					eventManage.getRefrnUrl(), eventManage.getRceptBeginDe(), eventManage.getRceptEndDe(),
					eventManage.getLastUpdusrId());
			eventRepository.save(entity);
		});
	}

	@Override
	public void deleteEventManage(EventManage eventManage) throws Exception {
		eventRepository.deleteById(eventManage.getEventId());
	}

	@Override
	public List<EventManageVO> selectEventAtdrnList(EventManageVO eventManageVO) throws Exception {
		return selectEventManageList(eventManageVO);
	}

	@Override
	public int selectEventAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception {
		return selectEventManageListTotCnt(eventManageVO);
	}

	@Override
	public List<EventManageVO> selectEventRceptConfmList(EventManageVO eventManageVO) throws Exception {
		return selectEventManageList(eventManageVO);
	}

	@Override
	public int selectEventRceptConfmListTotCnt(EventManageVO eventManageVO) throws Exception {
		return selectEventManageListTotCnt(eventManageVO);
	}

	@Override
	public List<EventManageVO> selectEventNmList(EventManageVO eventManageVO) throws Exception {
		return selectEventManageList(eventManageVO);
	}

	@Override
	public EventManageVO selectEventAtdrn(EventManageVO eventManageVO) throws Exception {
		return selectEventManage(eventManageVO);
	}

	@Override
	public void insertEventAtdrn(EventAtdrn eventAtdrn) throws Exception {
		eventAttendanceRepository.save(EventAttendance.builder()
				.eventId(eventAtdrn.getEventId())
				.applcntId(eventAtdrn.getApplcntId()) // Corrected builder method name
				.confmAt(eventAtdrn.getConfmAt())
				.build());
	}

	@Override
	public void deleteEventAtdrn(EventAtdrn eventAtdrn) throws Exception {
		eventAttendanceRepository
				.deleteById(new EventAttendance.EventAttendanceId(eventAtdrn.getApplcntId(), eventAtdrn.getEventId()));
	}

	@Override
	public void updtEventAtdrn(EventAtdrn eventAtdrn, String checkedEventRceptForConfm) throws Exception {
		eventAttendanceRepository.findByEventIdAndApplcntId(eventAtdrn.getEventId(), eventAtdrn.getApplcntId())
				.ifPresent(entity -> {
					entity.approve(eventAtdrn.getSanctnerId(), eventAtdrn.getConfmAt(), eventAtdrn.getReturnResn(),
							eventAtdrn.getLastUpdusrId());
					eventAttendanceRepository.save(entity);
				});
	}

	@Override
	public List<EventManageVO> selectEventReqstAtdrnList(EventManageVO eventManageVO) throws Exception {
		return selectEventManageList(eventManageVO);
	}

	@Override
	public int selectEventReqstAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception {
		return selectEventManageListTotCnt(eventManageVO);
	}

	private EventManageVO toVO(com.company.project.domain.event.Event entity) {
		EventManageVO vo = new EventManageVO();
		vo.setEventId(entity.getEventId());
		vo.setEventSe(entity.getEventSe());
		vo.setEventNm(entity.getEventNm());
		vo.setEventPurps(entity.getEventPurps());
		vo.setEventBeginDe(entity.getEventBeginDe());
		vo.setEventEndDe(entity.getEventEndDe());
		vo.setEventAuspcInsttNm(entity.getEventAuspcInsttNm());
		vo.setEventMngtInsttNm(entity.getEventMngtInsttNm());
		vo.setEventPlace(entity.getEventPlace());
		vo.setEventCn(entity.getEventCn());
		vo.setCtOccrrncAt(entity.getCtOccrrncAt());
		vo.setPartcptCt(entity.getPartcptCt());
		vo.setPsncpa(entity.getPsncpa());
		vo.setRefrnUrl(entity.getRefrnUrl());
		vo.setRceptBeginDe(entity.getRceptBeginDe());
		vo.setRceptEndDe(entity.getRceptEndDe());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}
}
