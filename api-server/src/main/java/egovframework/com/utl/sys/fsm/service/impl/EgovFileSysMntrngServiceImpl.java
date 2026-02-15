package egovframework.com.utl.sys.fsm.service.impl;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.FileSystemMonitoring;
import com.company.project.domain.monitoring.FileSystemMonitoringLog;
import com.company.project.domain.monitoring.FileSystemMonitoringLogRepository;
import com.company.project.domain.monitoring.FileSystemMonitoringRepository;

import egovframework.com.utl.sys.fsm.service.EgovFileSysMntrngService;
import egovframework.com.utl.sys.fsm.service.FileSysMntrng;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLog;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLogVO;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngVO;
import lombok.RequiredArgsConstructor;

/**
 * 파일시스템모니터링관리에 대한 ServiceImpl 클래스
 * 
 * @author 김진만
 * @since 2010.06.21
 * @version 1.1
 */
@Service("egovFileSysMntrngService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovFileSysMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovFileSysMntrngService {

	private final FileSystemMonitoringRepository fileSystemMonitoringRepository;
	private final FileSystemMonitoringLogRepository fileSystemMonitoringLogRepository;

	@Override
	@Transactional
	public void deleteFileSysMntrng(FileSysMntrng vo) throws Exception {
		fileSystemMonitoringRepository.deleteById(vo.getFileSysId());
	}

	@Override
	@Transactional
	public void insertFileSysMntrng(FileSysMntrng vo) throws Exception {
		FileSystemMonitoring entity = FileSystemMonitoring.builder()
				.fileSysId(vo.getFileSysId())
				.fileSysNm(vo.getFileSysNm())
				.fileSysManageNm(vo.getFileSysManageNm())
				.fileSysSize((long) vo.getFileSysMg())
				.fileSysThrhld((long) vo.getFileSysThrhld())
				.fileSysUsgQty((long) vo.getFileSysUsgQty())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		fileSystemMonitoringRepository.save(entity);
	}

	@Override
	@Transactional
	public void insertFileSysMntrngLog(FileSysMntrngLog vo) throws Exception {
		FileSystemMonitoringLog entity = FileSystemMonitoringLog.builder()
				.logId(vo.getLogId())
				.fileSysId(vo.getFileSysId())
				.fileSysNm(vo.getFileSysNm())
				.fileSysManageNm(vo.getFileSysManageNm())
				.fileSysSize((long) vo.getFileSysMg())
				.fileSysThrhld((long) vo.getFileSysThrhld())
				.fileSysUsgQty((long) vo.getFileSysUsgQty())
				.mntrngSttus(vo.getMntrngSttus())
				.logInfo(vo.getLogInfo())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		fileSystemMonitoringLogRepository.save(entity);
	}

	@Override
	public FileSysMntrngVO selectFileSysMntrng(FileSysMntrngVO vo) throws Exception {
		return fileSystemMonitoringRepository.findById(vo.getFileSysId())
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public FileSysMntrngLogVO selectFileSysMntrngLog(FileSysMntrngLogVO vo) throws Exception {
		return fileSystemMonitoringLogRepository.findById(vo.getLogId())
				.map(this::toLogVO)
				.orElse(null);
	}

	@Override
	public Map<String, Object> selectFileSysMntrngList(FileSysMntrngVO fileSysMntrngVO) throws Exception {
		List<FileSysMntrngVO> result = fileSystemMonitoringRepository
				.findAll(PageRequest.of(fileSysMntrngVO.getPageIndex() - 1, fileSysMntrngVO.getRecordCountPerPage(),
						Sort.by("createdDate").descending()))
				.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", result);
		map.put("resultCnt", fileSystemMonitoringRepository.count());
		return map;
	}

	@Override
	public int selectFileSysMg(FileSysMntrng fileSysMntrng) throws Exception {
		return fileSystemMonitoringRepository.findById(fileSysMntrng.getFileSysId())
				.map(e -> e.getFileSysSize() != null ? e.getFileSysSize().intValue() : 0)
				.orElse(0);
	}

	@Override
	public Map<String, Object> selectFileSysMntrngLogList(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception {
		List<FileSysMntrngLogVO> result = fileSystemMonitoringLogRepository
				.findAll(PageRequest.of(fileSysMntrngLogVO.getPageIndex() - 1,
						fileSysMntrngLogVO.getRecordCountPerPage(),
						Sort.by("creatDt").descending()))
				.getContent().stream()
				.map(this::toLogVO)
				.collect(Collectors.toList());

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", result);
		map.put("resultCnt", fileSystemMonitoringLogRepository.count());
		return map;
	}

	public int selectFileSysMntrngLogListCnt(FileSysMntrngLogVO searchVO) throws Exception {
		return (int) fileSystemMonitoringLogRepository.count();
	}

	@Override
	@Transactional
	public void updateFileSysMntrng(FileSysMntrng vo) throws Exception {
		fileSystemMonitoringRepository.findById(vo.getFileSysId()).ifPresent(e -> {
			e.update(vo.getFileSysNm(), vo.getFileSysManageNm(), (long) vo.getFileSysMg(), (long) vo.getFileSysThrhld(),
					(long) vo.getFileSysUsgQty(), vo.getMngrNm(), vo.getMngrEmailAddr(), vo.getLastUpdusrId());
		});
	}

	@Override
	@Transactional
	public void updateFileSysMntrngSttus(FileSysMntrng vo) throws Exception {
		fileSystemMonitoringRepository.findById(vo.getFileSysId()).ifPresent(e -> {
			e.updateStatus((long) vo.getFileSysMg(), (long) vo.getFileSysUsgQty(), vo.getMntrngSttus(), null,
					vo.getLastUpdusrId());
		});
	}

	private FileSysMntrngVO toVO(FileSystemMonitoring entity) {
		FileSysMntrngVO vo = new FileSysMntrngVO();
		vo.setFileSysId(entity.getFileSysId());
		vo.setFileSysNm(entity.getFileSysNm());
		vo.setFileSysManageNm(entity.getFileSysManageNm());
		vo.setFileSysMg(entity.getFileSysSize() != null ? entity.getFileSysSize().intValue() : 0);
		vo.setFileSysThrhld(entity.getFileSysThrhld() != null ? entity.getFileSysThrhld().intValue() : 0);
		vo.setFileSysUsgQty(entity.getFileSysUsgQty() != null ? entity.getFileSysUsgQty().intValue() : 0);
		vo.setMntrngSttus(entity.getMntrngSttus());
		vo.setMngrNm(entity.getMngrNm());
		vo.setMngrEmailAddr(entity.getMngrEmailAddr());
		return vo;
	}

	private FileSysMntrngLogVO toLogVO(FileSystemMonitoringLog entity) {
		FileSysMntrngLogVO vo = new FileSysMntrngLogVO();
		vo.setLogId(entity.getLogId());
		vo.setFileSysId(entity.getFileSysId());
		vo.setFileSysNm(entity.getFileSysNm());
		vo.setFileSysManageNm(entity.getFileSysManageNm());
		vo.setFileSysMg(entity.getFileSysSize() != null ? entity.getFileSysSize().intValue() : 0);
		vo.setFileSysThrhld(entity.getFileSysThrhld() != null ? entity.getFileSysThrhld().intValue() : 0);
		vo.setFileSysUsgQty(entity.getFileSysUsgQty() != null ? entity.getFileSysUsgQty().intValue() : 0);
		vo.setMntrngSttus(entity.getMntrngSttus());
		vo.setLogInfo(entity.getLogInfo());
		return vo;
	}
}