package egovframework.com.uss.ion.noi.service.impl;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.NotificationInf;
import com.company.project.domain.notification.NotificationInfRepository;

import egovframework.com.uss.ion.noi.service.EgovNotificationService;
import egovframework.com.uss.ion.noi.service.Notification;
import egovframework.com.uss.ion.noi.service.NotificationVO;
import jakarta.annotation.Resource;

@Service("egovNotificationService")
public class EgovNotificationServiceImpl extends EgovAbstractServiceImpl implements EgovNotificationService {

	@Resource(name = "notificationInfRepository")
	private NotificationInfRepository notificationInfRepository;

	@Resource(name = "egovNotificationIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public Map<String, Object> selectNotificationInfs(NotificationVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<NotificationInf> page = notificationInfRepository.findAll(pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));
		return map;
	}

	@Override
	public void insertNotificationInf(Notification searchVO) throws Exception {
		Long id = Long.parseLong(idgenService.getNextStringId());
		searchVO.setNtfcNo(id.toString());

		NotificationInf entity = NotificationInf.builder()
				.ntcnNo(id)
				.ntcnSj(searchVO.getNtfcSj())
				.ntcnCn(searchVO.getNtfcCn())
				.ntcnTm(searchVO.getNtfcTime())
				.bhNtcnIntrvl(searchVO.getBhNtfcIntrvlString())
				.frstRegisterId(searchVO.getFrstRegisterId())
				.build();

		notificationInfRepository.save(entity);
	}

	@Override
	public NotificationVO selectNotificationInf(NotificationVO searchVO) throws Exception {
		return notificationInfRepository.findById(Long.parseLong(searchVO.getNtfcNo()))
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void updateNotifictionInf(Notification searchVO) throws Exception {
		notificationInfRepository.findById(Long.parseLong(searchVO.getNtfcNo())).ifPresent(entity -> {
			entity.update(searchVO.getNtfcSj(), searchVO.getNtfcCn(), searchVO.getNtfcTime(),
					searchVO.getBhNtfcIntrvlString(), searchVO.getLastUpdusrId());
			notificationInfRepository.save(entity);
		});
	}

	@Override
	public void deleteNotifictionInf(Notification searchVO) throws Exception {
		notificationInfRepository.deleteById(Long.parseLong(searchVO.getNtfcNo()));
	}

	@Override
	public boolean checkNotification(Notification notification) throws Exception {
		return true; // Simple check logic
	}

	@Override
	public List<NotificationVO> selectNotificationData() throws Exception {
		LocalDateTime now = LocalDateTime.now();
		// Convert LocalDateTime to String for repository
		String start = now.minusHours(1).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
		String end = now.plusHours(1).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
		return notificationInfRepository.findByNtcnTmBetween(start, end)
				.stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	private NotificationVO toVO(NotificationInf entity) {
		NotificationVO vo = new NotificationVO();
		vo.setNtfcNo(entity.getNtcnNo().toString());
		vo.setNtfcSj(entity.getNtcnSj());
		vo.setNtfcCn(entity.getNtcnCn());
		vo.setNtfcTime(entity.getNtcnTm());
		vo.setBhNtfcIntrvlString(entity.getBhNtcnIntrvl());
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : "");
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}
}
