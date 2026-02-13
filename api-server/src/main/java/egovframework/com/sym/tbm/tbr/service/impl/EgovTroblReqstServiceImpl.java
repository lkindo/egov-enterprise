package egovframework.com.sym.tbm.tbr.service.impl;

import java.time.format.DateTimeFormatter;
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

import egovframework.com.sym.tbm.tbr.service.EgovTroblReqstService;
import egovframework.com.sym.tbm.tbr.service.TroblReqst;
import egovframework.com.sym.tbm.tbr.service.TroblReqstVO;
import jakarta.annotation.Resource;

@Service("egovTroblReqstService")
public class EgovTroblReqstServiceImpl extends EgovAbstractServiceImpl implements EgovTroblReqstService {

	@Resource
	private TroblRepository troblRepository;

	@Override
	public List<TroblReqstVO> selectTroblReqstList(TroblReqstVO troblReqstVO) throws Exception {
		Pageable pageable = PageRequest.of(troblReqstVO.getFirstIndex() / troblReqstVO.getRecordCountPerPage(),
				troblReqstVO.getRecordCountPerPage());
		
		List<String> statuses = (troblReqstVO.getStrProcessSttus() != null && !troblReqstVO.getStrProcessSttus().equals("00")) 
				? Collections.singletonList(troblReqstVO.getStrProcessSttus()) : null;
				
		Page<Trobl> page = troblRepository.searchTroblReqsts(
				troblReqstVO.getStrTroblNm(),
				troblReqstVO.getStrTroblKnd(),
				statuses,
				pageable);
				
		return page.getContent().stream().map(this::mapToVO).collect(Collectors.toList());
	}

	@Override
	public int selectTroblReqstListTotCnt(TroblReqstVO troblReqstVO) throws Exception {
		List<String> statuses = (troblReqstVO.getStrProcessSttus() != null && !troblReqstVO.getStrProcessSttus().equals("00")) 
				? Collections.singletonList(troblReqstVO.getStrProcessSttus()) : null;
				
		Page<Trobl> page = troblRepository.searchTroblReqsts(
				troblReqstVO.getStrTroblNm(),
				troblReqstVO.getStrTroblKnd(),
				statuses,
				PageRequest.of(0, 1));
		return (int) page.getTotalElements();
	}

	@Override
	public TroblReqstVO selectTroblReqst(TroblReqstVO troblReqstVO) throws Exception {
		return troblRepository.findById(troblReqstVO.getTroblId())
				.map(this::mapToVO)
				.orElse(null);
	}

	@Override
	@Transactional
	public TroblReqstVO insertTroblReqst(TroblReqst troblReqst, TroblReqstVO troblReqstVO) throws Exception {
		Trobl entity = Trobl.builder()
				.troblId(troblReqst.getTroblId())
				.troblNm(troblReqst.getTroblNm())
				.troblKnd(troblReqst.getTroblKnd())
				.troblDc(troblReqst.getTroblDc())
				.troblOccrrncTime(troblReqst.getTroblOccrrncTime())
				.troblRqesterNm(troblReqst.getTroblRqesterNm())
				.processSttus(troblReqst.getProcessSttus())
				.frstRegisterId(troblReqst.getFrstRegisterId())
				.frstRegisterPnttm(java.time.LocalDateTime.now())
				.lastUpdusrId(troblReqst.getLastUpdusrId())
				.lastUpdusrPnttm(java.time.LocalDateTime.now())
				.build();
		troblRepository.save(entity);
		troblReqstVO.setTroblId(entity.getTroblId());
		return selectTroblReqst(troblReqstVO);
	}

	@Override
	@Transactional
	public void updateTroblReqst(TroblReqst troblReqst) throws Exception {
		troblRepository.findById(troblReqst.getTroblId()).ifPresent(entity -> {
			entity.setTroblNm(troblReqst.getTroblNm());
			entity.setTroblKnd(troblReqst.getTroblKnd());
			entity.setTroblDc(troblReqst.getTroblDc());
			entity.setTroblOccrrncTime(troblReqst.getTroblOccrrncTime());
			entity.setTroblRqesterNm(troblReqst.getTroblRqesterNm());
			entity.setProcessSttus(troblReqst.getProcessSttus());
			entity.setLastUpdusrId(troblReqst.getLastUpdusrId());
			entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
		});
	}

	@Override
	@Transactional
	public void deleteTroblReqst(TroblReqst troblReqst) throws Exception {
		troblRepository.deleteById(troblReqst.getTroblId());
	}

	@Override
	@Transactional
	public void requstTroblReqst(TroblReqst troblReqst) throws Exception {
		troblRepository.findById(troblReqst.getTroblId()).ifPresent(entity -> {
			entity.setProcessSttus(troblReqst.getProcessSttus());
			if ("R".equals(troblReqst.getProcessSttus())) {
				entity.setTroblRequstTime(java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
			} else if ("A".equals(troblReqst.getProcessSttus())) {
				entity.setTroblRequstTime(null);
			}
			entity.setLastUpdusrId(troblReqst.getLastUpdusrId());
			entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
		});
	}

	private TroblReqstVO mapToVO(Trobl entity) {
		TroblReqstVO vo = new TroblReqstVO();
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
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "");
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null ? entity.getLastUpdusrPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "");
		return vo;
	}
}
