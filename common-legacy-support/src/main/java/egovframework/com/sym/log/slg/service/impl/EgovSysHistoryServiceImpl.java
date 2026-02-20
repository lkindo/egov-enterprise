package egovframework.com.sym.log.slg.service.impl;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.ModelMap;

import com.company.project.domain.log.SysHistoryRepository;

import egovframework.com.sym.log.slg.service.EgovSysHistoryService;
import egovframework.com.sym.log.slg.service.SysHistory;
import egovframework.com.sym.log.slg.service.SysHistoryVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import lombok.RequiredArgsConstructor;

/**
 * @Class Name : EgovSysHistoryServiceImpl.java
 * @Description : ?????????? ? ????? ?????
 * @Modification Information
 *
 *               ????????????
 *               ------- ------- -------------------
 *               2009. 3. 9. ????
 *               2026. 02. 11. antigravity JPA QueryDSL migration   
 *
 * @author ?      ????      ??            ?? ??      ??
 * @since 2009. 3. 9.
 * @version
 * @see
 *
 */
@Service("EgovSysHistoryService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovSysHistoryServiceImpl extends EgovAbstractServiceImpl implements
		EgovSysHistoryService {

	private final SysHistoryRepository sysHistoryRepository;

	/**
	 * ?????????????.
	 * 
	 * @param history - ???????? ?? ???
	 * @return
	 * @throws Exception
	 **/
	@Override
	@Transactional
	public Map<?, ?> insertSysHistory(SysHistory history) throws Exception {

		String histId = "HT_" + EgovStringUtil.getTimeStamp();
		history.setHistId(histId);

		com.company.project.domain.log.SysHistory entity = com.company.project.domain.log.SysHistory.builder()
				.histId(history.getHistId())
				.sysNm(history.getSysNm())
				.histSeCode(history.getHistSeCode())
				.histCn(history.getHistCn())
				.frstRegisterId(history.getFrstRegisterId())
				.atchFileId(history.getAtchFileId())
				.frstRegisterPnttm(LocalDateTime.now())
				.build();

		sysHistoryRepository.save(entity);

		return null;
	}

	/**
	 * ??????????????.
	 * 
	 * @param history - ???????? ?? ???
	 * @return
	 * @throws Exception
	 **/
	@Override
	@Transactional
	public void updateSysHistory(SysHistory history) throws Exception {
		sysHistoryRepository.findById(history.getHistId()).ifPresent(entity -> {
			entity.setSysNm(history.getSysNm());
			entity.setHistSeCode(history.getHistSeCode());
			entity.setHistCn(history.getHistCn());
			entity.setAtchFileId(history.getAtchFileId());
		});
	}

	/**
	 * ???????????????.
	 * 
	 * @param history - ???????? ?? ???
	 * @return
	 * @throws Exception
	 **/
	@Override
	@Transactional
	public void deleteSysHistory(SysHistory history) throws Exception {
		sysHistoryRepository.deleteById(history.getHistId());
	}

	/**
	 * ???????? ?????.
	 *
	 * @param history - ???????? ?? ???
	 * @return
	 * @throws Exception
	 **/
	@Override
	public void selectSysHistoryList(SysHistoryVO historyVO, ModelMap model) throws Exception {
		Pageable pageable = PageRequest.of(historyVO.getPageIndex() - 1, historyVO.getRecordCountPerPage());
		Page<com.company.project.domain.log.SysHistory> page = sysHistoryRepository.searchSysHistories(
				historyVO.getSearchCnd(), historyVO.getSearchWrd(), pageable);

		model.addAttribute("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		model.addAttribute("resultCnt", (int) page.getTotalElements());
	}

	/**
	 * ??????????????.
	 * 
	 * @param history - ???????? ?? ???
	 * @return
	 * @throws Exception
	 **/
	@Override
	public SysHistoryVO selectSysHistory(SysHistoryVO historyVO) throws Exception {
		return sysHistoryRepository.findById(historyVO.getHistId())
				.map(this::toVO)
				.orElse(null);
	}

	private SysHistoryVO toVO(com.company.project.domain.log.SysHistory entity) {
		SysHistoryVO vo = new SysHistoryVO();
		vo.setHistId(entity.getHistId());
		vo.setSysNm(entity.getSysNm());
		vo.setHistSeCode(entity.getHistSeCode());
		vo.setHistCn(entity.getHistCn());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setAtchFileId(entity.getAtchFileId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(
					entity.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
		}
		return vo;
	}

}
