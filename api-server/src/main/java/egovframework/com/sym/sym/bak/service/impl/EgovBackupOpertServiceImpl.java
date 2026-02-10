package egovframework.com.sym.sym.bak.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.system.BackupOpertRepository;
import com.company.project.domain.system.BackupResultRepository;
import com.company.project.domain.system.BackupSchdulDfkRepository;

import egovframework.com.sym.sym.bak.service.BackupOpert;
import egovframework.com.sym.sym.bak.service.BackupResult;
import egovframework.com.sym.sym.bak.service.EgovBackupOpertService;
import jakarta.annotation.Resource;

/**
 * 백업작업관리에 대한 ServiceImpl 클래스를 정의한다.
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
@Service("egovBackupOpertService")
public class EgovBackupOpertServiceImpl extends EgovAbstractServiceImpl implements EgovBackupOpertService {

	@Resource
	private BackupOpertRepository backupOpertRepository;

	@Resource
	private BackupResultRepository backupResultRepository;

	@Resource
	private BackupSchdulDfkRepository backupSchdulDfkRepository;

	/**
	 * 백업작업을 삭제한다.
	 * 
	 * @param backupOpert 삭제대상 백업작업model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void deleteBackupOpert(BackupOpert backupOpert)
			throws Exception {
		backupOpertRepository.findById(backupOpert.getBackupOpertId()).ifPresent(entity -> {
			com.company.project.domain.system.BackupOpert updated = com.company.project.domain.system.BackupOpert
					.builder()
					.backupOpertId(entity.getBackupOpertId())
					.backupOpertNm(entity.getBackupOpertNm())
					.backupOrginlDrctry(entity.getBackupOrginlDrctry())
					.backupStreDrctry(entity.getBackupStreDrctry())
					.cmprsSe(entity.getCmprsSe())
					.executCycle(entity.getExecutCycle())
					.executSchdulDe(entity.getExecutSchdulDe())
					.executSchdulHour(entity.getExecutSchdulHour())
					.executSchdulMnt(entity.getExecutSchdulMnt())
					.executSchdulSecnd(entity.getExecutSchdulSecnd())
					.useAt("N")
					.frstRegisterId(entity.getFrstRegisterId())
					.frstRegisterPnttm(entity.getFrstRegisterPnttm())
					.lastUpdusrId(backupOpert.getLastUpdusrId())
					.build();
			backupOpertRepository.save(updated);
		});
	}

	/**
	 * 백업작업을 등록한다.
	 * 
	 * @param backupOpert 등록대상 백업작업model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void insertBackupOpert(BackupOpert backupOpert)
			throws Exception {
		com.company.project.domain.system.BackupOpert entity = com.company.project.domain.system.BackupOpert.builder()
				.backupOpertId(backupOpert.getBackupOpertId())
				.backupOpertNm(backupOpert.getBackupOpertNm())
				.backupOrginlDrctry(backupOpert.getBackupOrginlDrctry())
				.backupStreDrctry(backupOpert.getBackupStreDrctry())
				.cmprsSe(backupOpert.getCmprsSe())
				.executCycle(backupOpert.getExecutCycle())
				.executSchdulDe(backupOpert.getExecutSchdulDe())
				.executSchdulHour(backupOpert.getExecutSchdulHour())
				.executSchdulMnt(backupOpert.getExecutSchdulMnt())
				.executSchdulSecnd(backupOpert.getExecutSchdulSecnd())
				.useAt("Y")
				.frstRegisterId(backupOpert.getFrstRegisterId())
				.lastUpdusrId(backupOpert.getLastUpdusrId())
				.build();
		backupOpertRepository.save(entity);
	}

	/**
	 * 백업작업을 상세조회 한다.
	 * 
	 * @return 백업작업정보
	 *
	 * @param backupOpert 조회대상 백업작업model
	 * @exception Exception Exception
	 */
	@Override
	public BackupOpert selectBackupOpert(BackupOpert backupOpert)
			throws Exception {
		return backupOpertRepository.findById(backupOpert.getBackupOpertId())
				.map(this::mapToBackupOpert)
				.orElse(null);
	}

	/**
	 * 백업작업의 목록을 조회 한다.
	 * 
	 * @return 백업작업목록
	 *
	 * @param searchVO 조회정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BackupOpert> selectBackupOpertList(BackupOpert searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		Page<Object[]> page = backupOpertRepository.selectBackupOpertList(
				String.valueOf(searchVO.getSearchCondition()),
				searchVO.getSearchKeyword(),
				pageable);
		return page.getContent().stream().map(this::mapToBackupOpert).collect(Collectors.toList());
	}

	/**
	 * 백업작업 목록 전체 건수를(을) 조회한다.
	 * 
	 * @return 목록건수
	 *
	 * @param searchVO 조회할 정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBackupOpertListCnt(BackupOpert searchVO)
			throws Exception {
		return (int) backupOpertRepository.count(); // Approximate
	}

	/**
	 * 백업작업정보를 수정한다.
	 *
	 * @param backupOpert 수정대상 백업작업model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void updateBackupOpert(BackupOpert backupOpert)
			throws Exception {
		backupOpertRepository.findById(backupOpert.getBackupOpertId()).ifPresent(entity -> {
			com.company.project.domain.system.BackupOpert updated = com.company.project.domain.system.BackupOpert
					.builder()
					.backupOpertId(entity.getBackupOpertId())
					.backupOpertNm(backupOpert.getBackupOpertNm())
					.backupOrginlDrctry(backupOpert.getBackupOrginlDrctry())
					.backupStreDrctry(backupOpert.getBackupStreDrctry())
					.cmprsSe(backupOpert.getCmprsSe())
					.executCycle(backupOpert.getExecutCycle())
					.executSchdulDe(backupOpert.getExecutSchdulDe())
					.executSchdulHour(backupOpert.getExecutSchdulHour())
					.executSchdulMnt(backupOpert.getExecutSchdulMnt())
					.executSchdulSecnd(backupOpert.getExecutSchdulSecnd())
					.useAt("Y")
					.frstRegisterId(entity.getFrstRegisterId())
					.frstRegisterPnttm(entity.getFrstRegisterPnttm())
					.lastUpdusrId(backupOpert.getLastUpdusrId())
					.build();
			backupOpertRepository.save(updated);
		});
	}

	/**
	 * 백업결과를 등록한다.
	 * 
	 * @param backupResult 등록대상 백업결과model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void insertBackupResult(BackupResult backupResult)
			throws Exception {
		com.company.project.domain.system.BackupResult entity = com.company.project.domain.system.BackupResult.builder()
				.backupResultId(backupResult.getBackupResultId())
				.backupOpertId(backupResult.getBackupOpertId())
				.backupFile(backupResult.getBackupFile())
				.sttus(backupResult.getSttus())
				.errorInfo(backupResult.getErrorInfo())
				.executBeginTime(backupResult.getExecutBeginTime())
				.executEndTime(backupResult.getExecutEndTime())
				.frstRegisterId(backupResult.getFrstRegisterId())
				.lastUpdusrId(backupResult.getLastUpdusrId())
				.build();
		backupResultRepository.save(entity);
	}

	/**
	 * 백업결과정보를 수정한다.
	 *
	 * @param backupResult 수정대상 백업결과model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void updateBackupResult(BackupResult backupResult)
			throws Exception {
		backupResultRepository.findById(backupResult.getBackupResultId()).ifPresent(entity -> {
			com.company.project.domain.system.BackupResult updated = com.company.project.domain.system.BackupResult
					.builder()
					.backupResultId(entity.getBackupResultId())
					.backupOpertId(entity.getBackupOpertId())
					.backupFile(backupResult.getBackupFile())
					.sttus(backupResult.getSttus())
					.errorInfo(backupResult.getErrorInfo())
					.executBeginTime(entity.getExecutBeginTime())
					.executEndTime(backupResult.getExecutEndTime())
					.frstRegisterId(entity.getFrstRegisterId())
					.frstRegisterPnttm(entity.getFrstRegisterPnttm())
					.lastUpdusrId(backupResult.getLastUpdusrId())
					.build();
			backupResultRepository.save(updated);
		});
	}

	private BackupOpert mapToBackupOpert(com.company.project.domain.system.BackupOpert entity) {
		BackupOpert vo = new BackupOpert();
		vo.setBackupOpertId(entity.getBackupOpertId());
		vo.setBackupOpertNm(entity.getBackupOpertNm());
		vo.setBackupOrginlDrctry(entity.getBackupOrginlDrctry());
		vo.setBackupStreDrctry(entity.getBackupStreDrctry());
		vo.setCmprsSe(entity.getCmprsSe());
		vo.setExecutCycle(entity.getExecutCycle());
		vo.setExecutSchdulDe(entity.getExecutSchdulDe());
		vo.setExecutSchdulHour(entity.getExecutSchdulHour());
		vo.setExecutSchdulMnt(entity.getExecutSchdulMnt());
		vo.setExecutSchdulSecnd(entity.getExecutSchdulSecnd());
		vo.setUseAt(entity.getUseAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private BackupOpert mapToBackupOpert(Object[] row) {
		BackupOpert vo = new BackupOpert();
		vo.setBackupOpertId((String) row[0]);
		vo.setExecutCycle((String) row[1]);
		vo.setExecutCycleNm((String) row[2]);
		vo.setExecutSchdulDe((String) row[3]);
		vo.setExecutSchdulHour((String) row[4]);
		vo.setExecutSchdulMnt((String) row[5]);
		vo.setExecutSchdulSecnd((String) row[6]);
		vo.setBackupOpertNm((String) row[7]);
		vo.setBackupOrginlDrctry((String) row[8]);
		vo.setBackupStreDrctry((String) row[9]);
		vo.setCmprsSe((String) row[10]);
		vo.setCmprsSeNm((String) row[11]);
		return vo;
	}
}
