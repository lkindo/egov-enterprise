package egovframework.com.uss.olp.mgt.service.impl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.meeting.MeetingManage;
import com.company.project.domain.meeting.MeetingManageRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.mgt.service.EgovMeetingManageService;
import egovframework.com.uss.olp.mgt.service.MeetingManageVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

@Service("egovMeetingManageService")
public class EgovMeetingManageServiceImpl extends EgovAbstractServiceImpl implements EgovMeetingManageService {

	@Resource(name = "meetingManageRepository")
	private MeetingManageRepository meetingManageRepository;

	@Resource(name = "egovMgtIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> egovMeetingManageLisAuthorGroupPopup(ComDefaultVO searchVO) {
		// 부서 목록 조회 기능 (기존 팝업 로직 유지 필요 시 별도 리포지토리 사용 권장)
		return Collections.emptyList();
	}

	@Override
	public List<EgovMap> egovMeetingManageLisEmpLyrPopup(ComDefaultVO searchVO) {
		// 아이디 목록 조회 기능 (기존 팝업 로직 유지 필요 시 별도 리포지토리 사용 권장)
		return Collections.emptyList();
	}

	@Override
	public List<EgovMap> selectMeetingManageList(ComDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<MeetingManage> page = meetingManageRepository.findAll(pageable);

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectMeetingManageDetail(MeetingManageVO meetingManageVO) throws Exception {
		MeetingManage entity = meetingManageRepository.findById(meetingManageVO.getMtgId())
				.orElseThrow(() -> processException("info.nodata.msg"));
		return Collections.singletonList(toEgovMap(entity));
	}

	@Override
	public int selectMeetingManageListCnt(ComDefaultVO searchVO) throws Exception {
		return (int) meetingManageRepository.count();
	}

	@Override
	public void insertMeetingManage(MeetingManageVO meetingManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		meetingManageVO.setMtgId(sMakeId);

		MeetingManage entity = MeetingManage.builder()
				.mtgId(sMakeId)
				.mtgNm(meetingManageVO.getMtgNm())
				.mtgMtrCn(meetingManageVO.getMtgMtrCn())
				.mtgSn(meetingManageVO.getMtgSn() != null ? Integer.parseInt(meetingManageVO.getMtgSn()) : null)
				.mtgCo(meetingManageVO.getMtgCo() != null ? Integer.parseInt(meetingManageVO.getMtgCo()) : null)
				.mtgDe(EgovStringUtil.removeMinusChar(meetingManageVO.getMtgDe()))
				.mtgPlace(meetingManageVO.getMtgPlace())
				.mtgBeginTm(meetingManageVO.getMtgBeginTime())
				.mtgEndTime(meetingManageVO.getMtgEndTime())
				.clsdrMtgAt(meetingManageVO.getClsdrMtgAt())
				.readngBgnde(EgovStringUtil.removeMinusChar(meetingManageVO.getReadngBeginDe()))
				.readngAt(meetingManageVO.getReadngAt())
				.mtgResultCn(meetingManageVO.getMtgResultCn())
				.mtgResultEnnc(meetingManageVO.getMtgResultEnnc())
				.etcMatter(meetingManageVO.getEtcMatter())
				.mngtDeptId(meetingManageVO.getMngtDeptId())
				.mnaerId(meetingManageVO.getMnaerId())
				.mnaerDeptId(meetingManageVO.getMnaerDeptId())
				.mtgAt(meetingManageVO.getMtnAt())
				.nonatdrnCo(meetingManageVO.getNonatdrnCo() != null ? Integer.parseInt(meetingManageVO.getNonatdrnCo())
						: null)
				.atdrnCo(meetingManageVO.getAtdrnCo() != null ? Integer.parseInt(meetingManageVO.getAtdrnCo()) : null)
				.frstRegisterId(meetingManageVO.getFrstRegisterId())
				.build();

		meetingManageRepository.save(entity);
	}

	@Override
	public void updateMeetingManage(MeetingManageVO meetingManageVO) {
		meetingManageRepository.findById(meetingManageVO.getMtgId()).ifPresent(entity -> {
			entity.update(
					meetingManageVO.getMtgNm(),
					meetingManageVO.getMtgMtrCn(),
					meetingManageVO.getMtgSn() != null ? Integer.parseInt(meetingManageVO.getMtgSn()) : null,
					meetingManageVO.getMtgCo() != null ? Integer.parseInt(meetingManageVO.getMtgCo()) : null,
					EgovStringUtil.removeMinusChar(meetingManageVO.getMtgDe()),
					meetingManageVO.getMtgPlace(),
					meetingManageVO.getMtgBeginTime(),
					meetingManageVO.getMtgEndTime(),
					meetingManageVO.getClsdrMtgAt(),
					EgovStringUtil.removeMinusChar(meetingManageVO.getReadngBeginDe()),
					meetingManageVO.getReadngAt(),
					meetingManageVO.getMtgResultCn(),
					meetingManageVO.getMtgResultEnnc(),
					meetingManageVO.getEtcMatter(),
					meetingManageVO.getMngtDeptId(),
					meetingManageVO.getMnaerId(),
					meetingManageVO.getMnaerDeptId(),
					meetingManageVO.getMtnAt(),
					meetingManageVO.getNonatdrnCo() != null ? Integer.parseInt(meetingManageVO.getNonatdrnCo()) : null,
					meetingManageVO.getAtdrnCo() != null ? Integer.parseInt(meetingManageVO.getAtdrnCo()) : null,
					meetingManageVO.getLastUpdusrId());
			meetingManageRepository.save(entity);
		});
	}

	@Override
	public void deleteMeetingManage(MeetingManageVO meetingManageVO) {
		meetingManageRepository.deleteById(meetingManageVO.getMtgId());
	}

	private EgovMap toEgovMap(MeetingManage entity) {
		EgovMap map = new EgovMap();
		map.put("mtgId", entity.getMtgId());
		map.put("mtgNm", entity.getMtgNm());
		map.put("mtgMtrCn", entity.getMtgMtrCn());
		map.put("mtgSn", entity.getMtgSn());
		map.put("mtgCo", entity.getMtgCo());
		map.put("mtgDe", entity.getMtgDe());
		map.put("mtgPlace", entity.getMtgPlace());
		map.put("mtgBeginTime", entity.getMtgBeginTm());
		map.put("mtgEndTime", entity.getMtgEndTime());
		map.put("clsdrMtgAt", entity.getClsdrMtgAt());
		map.put("readngBeginDe", entity.getReadngBgnde());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		return map;
	}
}
