package egovframework.com.sts.rst.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.rst.service.EgovReprtStatsService;
import egovframework.com.sts.rst.service.ReprtStats;
import egovframework.com.sts.rst.service.ReprtStatsVO;
import com.company.project.domain.stats.ReprtStatsRepository;
import lombok.RequiredArgsConstructor;

/**
 * 보고서 통계 검색 비즈니스 구현 클래스
 * 
 * @author 공통서비스 개발팀 박지욱
 * @since 2009.03.12
 * @version 1.1
 */
@Service("egovReprtStatsService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovReprtStatsServiceImpl extends EgovAbstractServiceImpl implements EgovReprtStatsService {

	private final ReprtStatsRepository reprtStatsRepository;
	private final EgovIdGnrService egovReprtStatsIdGnrService;

	/**
	 * 보고서 통계정보의 대상목록을 조회한다.
	 */
	@Override
	public List<ReprtStatsVO> selectReprtStatsList(ReprtStatsVO vo) throws Exception {
		return reprtStatsRepository.findByConditions(
				vo.getReprtTy(), vo.getPmFromDate(), vo.getPmToDate(),
				PageRequest.of(vo.getPageIndex() - 1, vo.getRecordCountPerPage()))
				.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	/**
	 * 보고서 통계정보의 대상목록 카운트를 조회한다.
	 */
	@Override
	public int selectReprtStatsListTotCnt(ReprtStatsVO vo) throws Exception {
		return (int) reprtStatsRepository.countByConditions(vo.getReprtTy(), vo.getPmFromDate(), vo.getPmToDate());
	}

	/**
	 * 보고서 통계의 상세정보를 조회한다.
	 */
	@Override
	public ReprtStatsVO selectReprtStats(ReprtStatsVO vo) throws Exception {
		return reprtStatsRepository.findById(vo.getReprtId()).map(this::toVO).orElse(null);
	}

	/**
	 * 보고서 통계 정보를 생성한다.
	 */
	@Override
	@Transactional
	public void insertReprtStats(ReprtStats vo) throws Exception {
		// New creation logic using repository
		// ReprtStats entity from domain package should be used
	}

	/**
	 * 보고서 유형별 통계정보를 그래프로 표현한다.
	 */
	@Override
	public List<ReprtStatsVO> selectReprtStatsBarList(ReprtStatsVO vo) throws Exception {
		List<Object[]> results;
		if ("TYPE".equals(vo.getStatsKind())) {
			results = reprtStatsRepository.countByReprtTy(vo.getPmFromDate(), vo.getPmToDate());
		} else if ("STATUS".equals(vo.getStatsKind())) {
			results = reprtStatsRepository.countByReprtSttus(vo.getPmFromDate(), vo.getPmToDate());
		} else {
			results = reprtStatsRepository.countByDate(vo.getPmFromDate(), vo.getPmToDate());
		}

		return results.stream().map(row -> {
			ReprtStatsVO rvo = new ReprtStatsVO();
			rvo.setGrpCnt(((Number) row[1]).intValue());
			rvo.setReprtTy((String) row[0]);
			return rvo;
		}).collect(Collectors.toList());
	}

	/**
	 * 보고서 통계 정보를 수정한다.
	 */
	@Override
	@Transactional
	public void updateReprtStats(ReprtStats vo) throws Exception {
		// Update logic
	}

	/**
	 * 보고서 통계 정보를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteReprtStats(ReprtStats vo) throws Exception {
		reprtStatsRepository.deleteById(vo.getReprtId());
	}

	private ReprtStatsVO toVO(com.company.project.domain.stats.ReprtStats entity) {
		ReprtStatsVO vo = new ReprtStatsVO();
		vo.setReprtId(entity.getReprtId());
		vo.setReprtNm(entity.getReprtNm());
		vo.setReprtTy(entity.getReprtTy());
		vo.setReprtSttus(entity.getReprtSttus());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setFrstRegistPnttm(entity.getFrstRegistPnttm().toString());
		return vo;
	}
}
