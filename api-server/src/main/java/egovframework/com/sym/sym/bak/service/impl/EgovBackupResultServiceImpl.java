package egovframework.com.sym.sym.bak.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.system.BackupResultRepository;

import egovframework.com.sym.sym.bak.service.BackupResult;
import egovframework.com.sym.sym.bak.service.EgovBackupResultService;
import jakarta.annotation.Resource;

/**
 * 백업결과관리에 대한 ServiceImpl 클래스를 정의한다.
 *
 * @author 김진만
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 오전 10:27:13
 * @see
 * 
 *      <pre>
 * == 개정이력(Modification Information) ==
 *
 *   수정일       수정자           수정내용
 *  -------     --------    ---------------------------
 *  2010.06.21   김진만     최초 생성
 *      </pre>
 */
@Service("egovBackupResultService")
public class EgovBackupResultServiceImpl extends EgovAbstractServiceImpl implements EgovBackupResultService {

	@Resource
	private BackupResultRepository backupResultRepository;

	/**
	 * 백업결과을 삭제한다.
	 * 
	 * @param backupResult 삭제대상 백업결과model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void deleteBackupResult(BackupResult backupResult)
			throws Exception {
		backupResultRepository.deleteById(backupResult.getBackupResultId());
	}

	/**
	 * 백업결과을 상세조회 한다.
	 * 
	 * @return 백업결과정보
	 *
	 * @param backupResult 조회대상 백업결과model
	 * @exception Exception Exception
	 */
	@Override
	public BackupResult selectBackupResult(BackupResult backupResult)
			throws Exception {
		return backupResultRepository.findById(backupResult.getBackupResultId())
				.map(this::mapToBackupResult)
				.orElse(null);
	}

	/**
	 * 백업결과의 목록을 조회 한다.
	 * 
	 * @return 백업결과목록
	 *
	 * @param searchVO 조회정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BackupResult> selectBackupResultList(BackupResult searchVO)
			throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		Page<Object[]> page = backupResultRepository.selectBackupResultList(
				searchVO.getSttus(),
				searchVO.getSearchKeywordFrom(),
				searchVO.getSearchKeywordTo(),
				String.valueOf(searchVO.getSearchCondition()),
				searchVO.getSearchKeyword(),
				pageable);
		return page.getContent().stream().map(this::mapToBackupResult).collect(Collectors.toList());
	}

	/**
	 * 백업결과 목록 전체 건수를(을) 조회한다.
	 * 
	 * @return 목록건수
	 *
	 * @param searchVO 조회할 정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBackupResultListCnt(BackupResult searchVO)
			throws Exception {
		return (int) backupResultRepository.count(); // Approximate
	}

	private BackupResult mapToBackupResult(com.company.project.domain.system.BackupResult entity) {
		BackupResult vo = new BackupResult();
		vo.setBackupResultId(entity.getBackupResultId());
		vo.setBackupOpertId(entity.getBackupOpertId());
		vo.setBackupFile(entity.getBackupFile());
		vo.setSttus(entity.getSttus());
		vo.setErrorInfo(entity.getErrorInfo());
		vo.setExecutBeginTime(entity.getExecutBeginTime());
		vo.setExecutEndTime(entity.getExecutEndTime());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private BackupResult mapToBackupResult(Object[] row) {
		BackupResult vo = new BackupResult();
		vo.setBackupResultId((String) row[0]);
		vo.setBackupOpertId((String) row[1]);
		vo.setBackupOpertNm((String) row[2]);
		vo.setBackupFile((String) row[3]);
		vo.setBackupOrginlDrctry((String) row[4]);
		vo.setBackupStreDrctry((String) row[5]);
		vo.setSttus((String) row[6]);
		vo.setSttusNm((String) row[7]);
		vo.setErrorInfo((String) row[8]);
		vo.setExecutBeginTime((String) row[9]);
		vo.setExecutEndTime((String) row[10]);
		return vo;
	}
}
