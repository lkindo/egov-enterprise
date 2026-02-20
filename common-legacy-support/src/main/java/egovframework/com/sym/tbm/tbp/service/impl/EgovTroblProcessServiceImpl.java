package egovframework.com.sym.tbm.tbp.service.impl;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.trouble.Trobl;
import com.company.project.domain.trouble.TroblRepository;

import egovframework.com.sym.tbm.tbp.service.EgovTroblProcessService;
import egovframework.com.sym.tbm.tbp.service.TroblProcess;
import egovframework.com.sym.tbm.tbp.service.TroblProcessVO;
import jakarta.annotation.Resource;

@Service("egovTroblProcessService")
public class EgovTroblProcessServiceImpl extends EgovAbstractServiceImpl implements EgovTroblProcessService {

	@Resource
	private TroblRepository troblRepository;

	@Override
	public List<TroblProcessVO> selectTroblProcessList(TroblProcessVO troblProcessVO) throws Exception {
		Pageable pageable = PageRequest.of(troblProcessVO.getFirstIndex() / troblProcessVO.getRecordCountPerPage(),
				troblProcessVO.getRecordCountPerPage());

		List<String> statuses;
		if (troblProcessVO.getStrProcessSttus() != null && !troblProcessVO.getStrProcessSttus().equals("00")) {
			statuses = Collections.singletonList(troblProcessVO.getStrProcessSttus());
		} else {
			statuses = Arrays.asList("R", "C");
		}

		Page<Trobl> page = troblRepository.searchTroblReqsts(
				troblProcessVO.getStrTroblNm(),
				troblProcessVO.getStrTroblKnd(),
				statuses,
				pageable);

		return page.getContent().stream().map(this::mapToVO).collect(Collectors.toList());
	}

	@Override
	public int selectTroblProcessListTotCnt(TroblProcessVO troblProcessVO) throws Exception {
		List<String> statuses;
		if (troblProcessVO.getStrProcessSttus() != null && !troblProcessVO.getStrProcessSttus().equals("00")) {
			statuses = Collections.singletonList(troblProcessVO.getStrProcessSttus());
		} else {
			statuses = Arrays.asList("R", "C");
		}

		Page<Trobl> page = troblRepository.searchTroblReqsts(
				troblProcessVO.getStrTroblNm(),
				troblProcessVO.getStrTroblKnd(),
				statuses,
				PageRequest.of(0, 1));
		return (int) page.getTotalElements();
	}

	@Override
	public TroblProcessVO selectTroblProcess(TroblProcessVO troblProcessVO) throws Exception {
		return troblRepository.findById(troblProcessVO.getTroblId())
				.map(this::mapToVO)
				.orElse(null);
	}

	@Override
	@Transactional
	public void insertTroblProcess(TroblProcess troblProcess) throws Exception {
		troblRepository.findById(troblProcess.getTroblId()).ifPresent(entity -> {
			entity.setTroblProcessResult(troblProcess.getTroblProcessResult());
			entity.setTroblOpetrNm(troblProcess.getTroblOpetrNm());
			entity.setTroblProcessTime(troblProcess.getTroblProcessTime());
			entity.setProcessSttus(troblProcess.getProcessSttus());
			entity.setLastUpdusrId(troblProcess.getLastUpdusrId());
			entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
		});
	}

	@Override
	@Transactional
	public void deleteTroblProcess(TroblProcess troblProcess) throws Exception {
		troblRepository.findById(troblProcess.getTroblId()).ifPresent(entity -> {
			entity.setTroblProcessResult(null);
			entity.setTroblOpetrNm(null);
			entity.setTroblProcessTime(null);
			entity.setProcessSttus(troblProcess.getProcessSttus());
			entity.setLastUpdusrId(troblProcess.getLastUpdusrId());
			entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
		});
	}

	private TroblProcessVO mapToVO(Trobl entity) {
		TroblProcessVO vo = new TroblProcessVO();
		vo.setTroblId(entity.getTroblId());
		vo.setTroblNm(entity.getTroblNm());
		vo.setTroblKnd(entity.getTroblKnd());
		vo.setTroblDc(entity.getTroblDc());
		vo.setTroblOccrrncTime(entity.getTroblOccrrncTime());
		vo.setTroblRqesterNm(entity.getTroblRqesterNm());
		vo.setTroblRequstTime(entity.getTroblRequstTime());
		vo.setTroblProcessResult(entity.getTroblProcessResult());
		vo.setTroblOpetrNm(entity.getTroblOpetrNm());
		vo.setTroblProcessTime(entity.getTroblProcessTime());
		vo.setProcessSttus(entity.getProcessSttus());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setFrstRegisterPnttm(entity.getCreatedDate() != null
				? entity.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		vo.setLastUpdusrPnttm(entity.getLastModifiedDate() != null
				? entity.getLastModifiedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		return vo;
	}
}
