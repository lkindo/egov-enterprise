package egovframework.com.cop.smt.lsm.service.impl;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.schedule.LeaderSchedule;
import com.company.project.domain.schedule.LeaderScheduleRepository;
import com.company.project.service.schedule.LeaderScheduleService;
import com.company.project.service.schedule.dto.LeaderScheduleDto;

import egovframework.com.cop.smt.lsm.service.EgovLeaderSchdulService;
import egovframework.com.cop.smt.lsm.service.LeaderSchdul;
import egovframework.com.cop.smt.lsm.service.LeaderSchdulVO;
import egovframework.com.cop.smt.lsm.service.LeaderSttus;
import egovframework.com.cop.smt.lsm.service.LeaderSttusVO;
import jakarta.annotation.Resource;

@Service("egovLeaderSchdulService")
public class EgovLeaderSchdulServiceImpl extends EgovAbstractServiceImpl implements EgovLeaderSchdulService {

	@Resource(name = "leaderScheduleRepository")
	private LeaderScheduleRepository leaderScheduleRepository;

	@Resource(name = "leaderScheduleService")
	private LeaderScheduleService leaderScheduleService;

	@Resource(name = "egovLeaderSchdulIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<LeaderSchdulVO> selectLeaderSchdulList(LeaderSchdulVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<LeaderSchedule> page = leaderScheduleRepository.findByScheduleNmContaining(
				searchVO.getSearchKeyword() == null ? "" : searchVO.getSearchKeyword(), pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectLeaderSchdulListCnt(LeaderSchdulVO searchVO) throws Exception {
		return (int) leaderScheduleRepository.count();
	}

	@Override
	public LeaderSchdulVO selectLeaderSchdul(LeaderSchdulVO leaderSchdulVO) throws Exception {
		return leaderScheduleRepository.findById(leaderSchdulVO.getSchdulId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		leaderScheduleService.createLeaderSchedule(leaderSchdul.getFrstRegisterId(), toDto(leaderSchdul));
	}

	@Override
	public void updateLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		leaderScheduleService.updateLeaderSchedule(leaderSchdul.getSchdulId(), leaderSchdul.getLastUpdusrId(), toDto(leaderSchdul));
	}

	@Override
	public void deleteLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		leaderScheduleService.deleteLeaderSchedule(leaderSchdul.getSchdulId());
	}

	@Override
	public Map<String, Object> selectLeaderSttusList(LeaderSttusVO searchVO) throws Exception {
		Map<String, Object> map = new HashMap<>();
		map.put("resultList", Collections.emptyList());
		map.put("resultCnt", 0);
		return map;
	}

	@Override
	public int selectLeaderSttusListCnt(LeaderSttusVO searchVO) throws Exception {
		return 0;
	}

	@Override
	public LeaderSttusVO selectLeaderSttus(LeaderSttusVO leaderSttusVO) throws Exception {
		return null;
	}

	@Override
	public void insertLeaderSttus(LeaderSttus leaderSttus) throws Exception {
	}

	@Override
	public void updateLeaderSttus(LeaderSttus leaderSttus) throws Exception {
	}

	@Override
	public void deleteLeaderSttus(LeaderSttus leaderSttus) throws Exception {
	}

	@Override
	public int selectLeaderSttusCheck(LeaderSttus leaderSttus) throws Exception {
		return 0;
	}

	private LeaderSchdulVO toVO(LeaderSchedule entity) {
		LeaderSchdulVO vo = new LeaderSchdulVO();
		vo.setSchdulId(entity.getScheduleId());
		vo.setSchdulNm(entity.getScheduleNm());
		vo.setSchdulCn(entity.getScheduleCn());
		vo.setSchdulPlace(entity.getSchedulePlace());
		vo.setLeaderId(entity.getLeaderId());
		vo.setReptitSeCode(entity.getReptitSeCode());
		vo.setSchdulIpcrCode(entity.getScheduleIpcrCode());
		vo.setSchdulBgnDe(entity.getBeginDate());
		vo.setSchdulEndDe(entity.getEndDate());
		vo.setSchdulChargerId(entity.getChargerId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}

	private LeaderScheduleDto toDto(LeaderSchdul model) {
		return LeaderScheduleDto.builder()
				.scheduleId(model.getSchdulId())
				.scheduleSe(model.getSchdulSe())
				.scheduleNm(model.getSchdulNm())
				.scheduleCn(model.getSchdulCn())
				.schedulePlace(model.getSchdulPlace())
				.leaderId(model.getLeaderId())
				.reptitSeCode(model.getReptitSeCode())
				.scheduleIpcrCode(model.getSchdulIpcrCode())
				.beginDate(model.getSchdulBgnDe())
				.endDate(model.getSchdulEndDe())
				.chargerId(model.getSchdulChargerId())
				.build();
	}
}
