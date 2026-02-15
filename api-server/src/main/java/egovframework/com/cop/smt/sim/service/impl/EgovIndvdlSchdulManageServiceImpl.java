package egovframework.com.cop.smt.sim.service.impl;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.company.project.service.schedule.ScheduleService;
import com.company.project.service.schedule.dto.ScheduleDto;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.smt.sim.service.EgovIndvdlSchdulManageService;
import egovframework.com.cop.smt.sim.service.IndvdlSchdulManageVO;
import jakarta.annotation.Resource;

@Service("egovIndvdlSchdulManageService")
public class EgovIndvdlSchdulManageServiceImpl extends EgovAbstractServiceImpl
		implements EgovIndvdlSchdulManageService {

	@Resource(name = "scheduleService")
	private ScheduleService scheduleService;

	@Resource(name = "deptSchdulManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> selectIndvdlSchdulManageMainList(Map<String, String> map) throws Exception {
		// Based on ScheduleService.getMonthlySchedule logic
		// 'map' contains 'yearMonth' or similar criteria
		String yearMonth = map.get("yearMonth");
		if (yearMonth == null) {
			yearMonth = java.time.format.DateTimeFormatter.ofPattern("yyyyMM").format(java.time.LocalDate.now());
		}
		List<ScheduleDto> list = scheduleService.getMonthlySchedule(map.get("uniqId"), yearMonth);
		return list.stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectIndvdlSchdulManageRetrieve(Map<String, String> map) throws Exception {
		List<ScheduleDto> list = scheduleService.getScheduleListByDateRange(
				map.get("uniqId"),
				map.get("schdulBgnde"),
				map.get("schdulEndde"));
		return list.stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public IndvdlSchdulManageVO selectIndvdlSchdulManageDetailVO(IndvdlSchdulManageVO vo) throws Exception {
		ScheduleDto dto = scheduleService.getSchedule(vo.getSchdulId());
		return toVO(dto);
	}

	@Override
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageList(ComDefaultVO searchVO) throws Exception {
		Page<ScheduleDto> page = scheduleService.getScheduleList(
				null, // schdulSe not directly used here or passed via VO
				null, // ownerId
				PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageSize()));
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageDetail(IndvdlSchdulManageVO vo) throws Exception {
		ScheduleDto dto = scheduleService.getSchedule(vo.getSchdulId());
		return List.of(toVO(dto));
	}

	@Override
	public int selectIndvdlSchdulManageListCnt(ComDefaultVO searchVO) throws Exception {
		Page<ScheduleDto> page = scheduleService.getScheduleList(
				null,
				null,
				PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageSize()));
		return (int) page.getTotalElements();
	}

	@Override
	public void insertIndvdlSchdulManage(IndvdlSchdulManageVO vo) throws Exception {
		if (vo.getSchdulId() == null || vo.getSchdulId().isEmpty()) {
			vo.setSchdulId(idgenService.getNextStringId());
		}
		scheduleService.createSchedule(vo.getFrstRegisterId(), toDto(vo));
	}

	@Override
	public void updateIndvdlSchdulManage(IndvdlSchdulManageVO vo) throws Exception {
		scheduleService.updateSchedule(vo.getSchdulId(), vo.getLastUpdusrId(), toDto(vo));
	}

	@Override
	public void deleteIndvdlSchdulManage(IndvdlSchdulManageVO vo) throws Exception {
		scheduleService.deleteSchedule(vo.getSchdulId(), vo.getLastUpdusrId());
	}

	private EgovMap toEgovMap(ScheduleDto dto) {
		EgovMap map = new EgovMap();
		map.put("schdulId", dto.getSchdulId());
		map.put("schdulSe", dto.getSchdulSe());
		map.put("schdulDeptId", dto.getSchdulDeptId());
		map.put("schdulKindCode", dto.getSchdulKindCode());
		map.put("schdulBgnde", dto.getSchdulBgnde());
		map.put("schdulEndde", dto.getSchdulEndde());
		map.put("schdulNm", dto.getSchdulNm());
		map.put("schdulCn", dto.getSchdulCn());
		map.put("schdulPlace", dto.getSchdulPlace());
		map.put("schdulIpcrCode", dto.getSchdulIpcrCode());
		map.put("schdulChargerId", dto.getSchdulChargerId());
		map.put("atchFileId", dto.getAtchFileId());
		return map;
	}

	private IndvdlSchdulManageVO toVO(ScheduleDto dto) {
		IndvdlSchdulManageVO vo = new IndvdlSchdulManageVO();
		vo.setSchdulId(dto.getSchdulId());
		vo.setSchdulSe(dto.getSchdulSe());
		vo.setSchdulDeptId(dto.getSchdulDeptId());
		vo.setSchdulKindCode(dto.getSchdulKindCode());
		vo.setSchdulBgnde(dto.getSchdulBgnde());
		vo.setSchdulEndde(dto.getSchdulEndde());
		vo.setSchdulNm(dto.getSchdulNm());
		vo.setSchdulCn(dto.getSchdulCn());
		vo.setSchdulPlace(dto.getSchdulPlace());
		vo.setSchdulIpcrCode(dto.getSchdulIpcrCode());
		vo.setSchdulChargerId(dto.getSchdulChargerId());
		vo.setAtchFileId(dto.getAtchFileId());
		vo.setFrstRegisterId(dto.getFrstRegisterId());
		vo.setLastUpdusrId(dto.getLastUpdusrId());
		return vo;
	}

	private ScheduleDto toDto(IndvdlSchdulManageVO vo) {
		return ScheduleDto.builder()
				.schdulId(vo.getSchdulId())
				.schdulSe(vo.getSchdulSe())
				.schdulDeptId(vo.getSchdulDeptId())
				.schdulKindCode(vo.getSchdulKindCode())
				.schdulBgnde(vo.getSchdulBgnde())
				.schdulEndde(vo.getSchdulEndde())
				.schdulNm(vo.getSchdulNm())
				.schdulCn(vo.getSchdulCn())
				.schdulPlace(vo.getSchdulPlace())
				.schdulIpcrCode(vo.getSchdulIpcrCode())
				.schdulChargerId(vo.getSchdulChargerId())
				.atchFileId(vo.getAtchFileId())
				.reptitSeCode(vo.getReptitSeCode())
				.build();
	}
}
