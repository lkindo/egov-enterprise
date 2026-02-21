package egovframework.com.sts.bst.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.log.BbsSummaryRepository;

import egovframework.com.sts.bst.service.EgovBbsStatsService;
import egovframework.com.sts.com.StatsVO;
import lombok.RequiredArgsConstructor;

/**
 * ???????????? ? ?????
 * 
 * @author ???????? ???
 * @since 2009.03.12
 * @version 1.1
 **/
@Service("egovBbsStatsService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovBbsStatsServiceImpl extends EgovAbstractServiceImpl implements EgovBbsStatsService {

	private final BbsSummaryRepository bbsSummaryRepository;

	/**
	 * ?????????????
	 **/
	@Override
	public List<StatsVO> selectBbsCretCntStats(StatsVO vo) throws Exception {
		return mapToStatsVO(bbsSummaryRepository.selectBbsCretCntStats(vo.getPdKind(), vo.getStatsKind(),
				vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate()));
	}

	/**
	 * ??????? ???????
	 **/
	@Override
	public List<StatsVO> selectBbsTotCntStats(StatsVO vo) throws Exception {
		return mapToStatsVO(bbsSummaryRepository.selectBbsTotCntStats(vo.getPdKind(), vo.getStatsKind(),
				vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate()));
	}

	/**
	 * ???????????????
	 **/
	@Override
	public List<StatsVO> selectBbsAvgCntStats(StatsVO vo) throws Exception {
		List<Object[]> resultList = bbsSummaryRepository.selectBbsAvgCntStats(vo.getPdKind(), vo.getStatsKind(),
				vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
		List<StatsVO> statsList = new ArrayList<>();
		for (Object[] row : resultList) {
			StatsVO stats = new StatsVO();
			stats.setAvrgInqireCo(((Number) row[0]).floatValue());
			stats.setStatsDate((String) row[1]);
			statsList.add(stats);
		}
		return statsList;
	}

	/**
	 * ?? ???????????
	 **/
	@Override
	public List<StatsVO> selectBbsMaxCntStats(StatsVO vo) throws Exception {
		List<Object[]> resultList = bbsSummaryRepository.selectBbsMaxCntStats(vo.getStatsKind(),
				vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
		List<StatsVO> statsList = new ArrayList<>();
		for (Object[] row : resultList) {
			StatsVO stats = new StatsVO();
			stats.setStatsDate((String) row[0]);
			stats.setMxmmInqireBbsId((String) row[1]);
			stats.setMxmmInqireBbsNm((String) row[2]);
			stats.setMaxStatsCo(((Number) row[3]).intValue());
			statsList.add(stats);
		}
		return statsList;
	}

	/**
	 * ?? ???????????
	 **/
	@Override
	public List<StatsVO> selectBbsMinCntStats(StatsVO vo) throws Exception {
		List<Object[]> resultList = bbsSummaryRepository.selectBbsMinCntStats(vo.getStatsKind(),
				vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
		List<StatsVO> statsList = new ArrayList<>();
		for (Object[] row : resultList) {
			StatsVO stats = new StatsVO();
			stats.setStatsDate((String) row[0]);
			stats.setMummInqireBbsId((String) row[1]);
			stats.setMummInqireBbsNm((String) row[2]);
			stats.setMinStatsCo(((Number) row[3]).intValue());
			statsList.add(stats);
		}
		return statsList;
	}

	/**
	 * ??????????????
	 **/
	@Override
	public List<StatsVO> selectBbsMaxUserStats(StatsVO vo) throws Exception {
		List<Object[]> resultList = bbsSummaryRepository.selectBbsMaxUserStats(vo.getStatsKind(),
				vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
		List<StatsVO> statsList = new ArrayList<>();
		for (Object[] row : resultList) {
			StatsVO stats = new StatsVO();
			stats.setStatsDate((String) row[0]);
			stats.setTopNtcepersonId((String) row[1]);
			stats.setTopNtcepersonCo(((Number) row[2]).intValue());
			statsList.add(stats);
		}
		return statsList;
	}

	/**
	 * ??????? ?????????? ?????
	 **/
	@Override
	@Transactional
	public void summaryBbsStats() throws Exception {
		// eGovFrame 5.0??????DAO??????????????????
		// JPA ?????Native Query ?? Entity????? ??????
		// ? ??????????? ??? ??? ???
		// ???Scheduler?? ????????????????Native Query????? insert ?? ??
		// ???? ?????? ???? ????? ??????
		// ??????? ????????? ??? ??

		// ??:
		// 1. ????????(? ???
		// 2. ??? ?????? ?
		// 3. ????????? ????? ???? ??insert
		// (??DAO ??????????????
	}

	private List<StatsVO> mapToStatsVO(List<Object[]> resultList) {
		List<StatsVO> statsList = new ArrayList<>();
		if (resultList == null)
			return statsList;

		for (Object[] row : resultList) {
			StatsVO stats = new StatsVO();
			if (row.length >= 2) {
				stats.setStatsCo(((Number) row[0]).intValue());
				stats.setStatsDate((String) row[1]);
			}
			statsList.add(stats);
		}
		return statsList;
	}
}
