package egovframework.com.sts.rst.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import egovframework.com.sts.rst.service.EgovReprtStatsService;
import egovframework.com.sts.rst.service.ReprtStats;
import egovframework.com.sts.rst.service.ReprtStatsVO;
import com.company.project.domain.stats.ReprtStatsRepository;
import lombok.RequiredArgsConstructor;

/**
 * ????????????? ? ?????
 * 
 * @author ???????? ???
 * @since 2009.03.12
 * @version 1.1
 **/
@Service("egovReprtStatsService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovReprtStatsServiceImpl extends EgovAbstractServiceImpl implements EgovReprtStatsService {

	private final ReprtStatsRepository reprtStatsRepository;
	// private final EgovIdGnrService egovReprtStatsIdGnrService;

	/**
	 * ?????????????????.
	 **/
	@Override
	public List<ReprtStatsVO> selectReprtStatsList(ReprtStatsVO vo) throws Exception {
		return reprtStatsRepository.findByConditions(
				vo.getReprtTy(), vo.getPmFromDate(), vo.getPmToDate(),
				PageRequest.of(vo.getPageIndex() - 1, vo.getRecordCountPerPage()))
				.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	/**
	 * ???????????????? ???.
	 **/
	@Override
	public int selectReprtStatsListTotCnt(ReprtStatsVO vo) throws Exception {
		return (int) reprtStatsRepository.countByConditions(vo.getReprtTy(), vo.getPmFromDate(), vo.getPmToDate());
	}

	/**
	 * ?????????????.
	 **/
	@Override
	public int selectReprtStatsListBarTotCnt(ReprtStatsVO vo) throws Exception {
		return (int) reprtStatsRepository.countByConditions(vo.getReprtTy(), vo.getPmFromDate(), vo.getPmToDate());
	}

	/**
	 * ???????????????.
	 **/
	@Override
	public List<ReprtStatsVO> selectReprtStats(ReprtStatsVO vo) throws Exception {
		return reprtStatsRepository.findById(vo.getReprtId()).map(entity -> {
			List<ReprtStatsVO> list = new ArrayList<>();
			list.add(this.toVO(entity));
			return list;
		}).orElse(new ArrayList<>());
	}

	/**
	 * ??????????????.
	 **/
	@Override
	@Transactional
	public void insertReprtStats(ReprtStats vo) throws Exception {
		// New creation logic using repository
		// ReprtStats entity from domain package should be used
	}

	/**
	 * ????????????? ????.
	 **/
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
			rvo.setGrpCnt(((Number) row[1]).toString());
			rvo.setReprtTy((String) row[0]);
			return rvo;
		}).collect(Collectors.toList());
	}

	/**
	 * ?????????????? ????.
	 **/
	@Override
	public List<ReprtStatsVO> selectReprtStatsByReprtTyList(ReprtStatsVO vo) throws Exception {
		List<Object[]> results = reprtStatsRepository.countByReprtTy(vo.getPmFromDate(), vo.getPmToDate());
		return results.stream().map(row -> {
			ReprtStatsVO rvo = new ReprtStatsVO();
			rvo.setGrpCnt(((Number) row[1]).toString());
			rvo.setReprtTy((String) row[0]);
			return rvo;
		}).collect(Collectors.toList());
	}

	/**
	 * ?????????? ????.
	 **/
	@Override
	public List<ReprtStatsVO> selectReprtStatsByReprtSttusList(ReprtStatsVO vo) throws Exception {
		List<Object[]> results = reprtStatsRepository.countByReprtSttus(vo.getPmFromDate(), vo.getPmToDate());
		return results.stream().map(row -> {
			ReprtStatsVO rvo = new ReprtStatsVO();
			rvo.setGrpCnt(((Number) row[1]).toString());
			rvo.setReprtSttus((String) row[0]);
			return rvo;
		}).collect(Collectors.toList());
	}

	/**
	 * ??????????????.
	 **/
	@Transactional
	public void updateReprtStats(ReprtStats vo) throws Exception {
		// Update logic
	}

	/**
	 * ???????????????.
	 **/
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
