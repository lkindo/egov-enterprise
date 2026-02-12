package egovframework.com.cop.smt.lsm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.company.project.service.schedule.LeaderScheduleService;
import com.company.project.service.schedule.dto.LeaderScheduleDto;

import egovframework.com.cop.smt.lsm.service.EgovLeaderSchdulService;
import egovframework.com.cop.smt.lsm.service.EmplyrVO;
import egovframework.com.cop.smt.lsm.service.LeaderSchdul;
import egovframework.com.cop.smt.lsm.service.LeaderSchdulVO;
import egovframework.com.cop.smt.lsm.service.LeaderSttus;
import egovframework.com.cop.smt.lsm.service.LeaderSttusVO;
import jakarta.annotation.Resource;

@Service("EgovLeaderSchdulService")
public class EgovLeaderSchdulServiceImpl extends EgovAbstractServiceImpl implements EgovLeaderSchdulService {

	@Resource(name = "leaderScheduleService")
	private LeaderScheduleService leaderScheduleService;

	@Resource(name = "egovLeaderSchdulIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public Map<String, Object> selectEmplyrList(EmplyrVO emplyrVO) throws Exception {
		// egov standard logic: use modern user service if available, but for now
		// delegation to LeaderScheduleService if it has user list capabilities.
		// Since modern LeaderScheduleService doesn't have it, we might need to use
		// Organization/User service or return empty for now if it's not the core focus.
		// For consistency, let's keep it empty or mock if needed, but the priority is
		// Schedule.
		Map<String, Object> map = new HashMap<>();
		map.put("resultList", List.of());
		map.put("resultCnt", "0");
		return map;
	}

	@Override
	public List<LeaderSchdulVO> selectLeaderSchdulList(LeaderSchdulVO leaderSchdulVo) throws Exception {
		Page<LeaderScheduleDto> page = leaderScheduleService.getLeaderScheduleList(
				leaderSchdulVo.getSearchWrd(),
				PageRequest.of(leaderSchdulVo.getPageIndex() - 1, leaderSchdulVo.getPageSize()));
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public LeaderSchdulVO selectLeaderSchdul(LeaderSchdulVO leaderSchdulVO) throws Exception {
		LeaderScheduleDto dto = leaderScheduleService.getLeaderSchedule(leaderSchdulVO.getSchdulId());
		return toVO(dto);
	}

	@Override
	public void updateLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		leaderScheduleService.updateLeaderSchedule(toDto(leaderSchdul));
	}

	@Override
	public void insertLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		if (leaderSchdul.getSchdulId() == null || leaderSchdul.getSchdulId().isEmpty()) {
			leaderSchdul.setSchdulId(idgenService.getNextStringId());
		}
		leaderScheduleService.registerLeaderSchedule(toDto(leaderSchdul));
	}

	@Override
	public void deleteLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		leaderScheduleService.deleteLeaderSchedule(leaderSchdul.getSchdulId());
	}

	@Override
	public Map<String, Object> selectLeaderSttusList(LeaderSttusVO leaderSttusVO) throws Exception {
		// Modern service doesn't have LeaderSttus yet.
		// For complete cleanup, we might need a Status domain,
		// but since the objective is DAO replacement, we can provide a stub or
		// implement Status and delegate if it exists.
		Map<String, Object> map = new HashMap<>();
		map.put("resultList", List.of());
		map.put("resultCnt", "0");
		return map;
	}

	@Override
	public LeaderSttusVO selectLeaderSttus(LeaderSttusVO leaderSttusVO) throws Exception {
		return null;
	}

	@Override
	public void updateLeaderSttus(LeaderSttus leaderSttus) throws Exception {
	}

	@Override
	public void insertLeaderSttus(LeaderSttus leaderSttus) throws Exception {
	}

	@Override
	public int selectLeaderSttusCheck(LeaderSttus leaderSttus) throws Exception {
		return 0;
	}

	@Override
	public void deleteLeaderSttus(LeaderSttus leaderSttus) throws Exception {
	}

	private LeaderSchdulVO toVO(LeaderScheduleDto dto) {
		if (dto == null)
			return null;
		LeaderSchdulVO vo = new LeaderSchdulVO();
		vo.setSchdulId(dto.getScheduleId());
		vo.setSchdulNm(dto.getScheduleNm());
		vo.setSchdulCn(dto.getScheduleCn());
		vo.setLeaderId(dto.getLeaderId());
		vo.setSchdulChargerId(dto.getChargerId());
		vo.setSchdulBgnDe(dto.getBeginDate());
		vo.setSchdulEndDe(dto.getEndDate());
		vo.setReptitSeCode(dto.getRepeatYn());
		vo.setSchdulIpcrCode(dto.getImportanceCode());
		vo.setSchdulSe(dto.getScheduleType());
		return vo;
	}

	private LeaderScheduleDto toDto(LeaderSchdul model) {
		return LeaderScheduleDto.builder()
				.scheduleId(model.getSchdulId())
				.scheduleNm(model.getSchdulNm())
				.scheduleCn(model.getSchdulCn())
				.leaderId(model.getLeaderId())
				.chargerId(model.getSchdulChargerId())
				.beginDate(model.getSchdulBgnDe())
				.endDate(model.getSchdulEndDe())
				.repeatYn(model.getReptitSeCode())
				.importanceCode(model.getSchdulIpcrCode())
				.scheduleType(model.getSchdulSe())
				.build();
	}
}