package egovframework.com.sym.bat.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.batch.BatchResultRepository;
import com.company.project.domain.batch.BatchSchdulDfkRepository;
import com.company.project.domain.batch.BatchSchdulRepository;

import egovframework.com.sym.bat.service.BatchResult;
import egovframework.com.sym.bat.service.BatchSchdul;
import egovframework.com.sym.bat.service.EgovBatchSchdulService;
import jakarta.annotation.Resource;

/**
 * 배치스케줄관리에 대한 ServiceImpl 클래스를 정의한다.
 *
 * @author 김진만
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 오전 10:27:13
 * @see
 * 
 *      <pre>
 * == 개정이력(Modification Information) ==
 *
 *   수정일       수정자           수정내용
 *  -------     --------    ---------------------------
 *  2010.06.17   김진만     최초 생성
 *      </pre>
 */
@Service("egovBatchSchdulService")
public class EgovBatchSchdulServiceImpl extends EgovAbstractServiceImpl implements EgovBatchSchdulService {

	@Resource
	private BatchSchdulRepository batchSchdulRepository;

	@Resource
	private BatchResultRepository batchResultRepository;

	@Resource
	private BatchSchdulDfkRepository batchSchdulDfkRepository;

	/**
	 * 배치스케줄을 삭제한다.
	 * 
	 * @param batchSchdul 삭제대상 배치스케줄model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void deleteBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		batchSchdulDfkRepository.deleteByIdBatchSchdulId(batchSchdul.getBatchSchdulId());
		batchSchdulRepository.deleteById(batchSchdul.getBatchSchdulId());
	}

	/**
	 * 배치스케줄을 등록한다.
	 * 
	 * @param batchSchdul 등록대상 배치스케줄model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void insertBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		com.company.project.domain.batch.BatchSchdul entity = com.company.project.domain.batch.BatchSchdul.builder()
				.batchSchdulId(batchSchdul.getBatchSchdulId())
				.batchOpertId(batchSchdul.getBatchOpertId())
				.executCycle(batchSchdul.getExecutCycle())
				.executSchdulDe(batchSchdul.getExecutSchdulDe())
				.executSchdulHour(batchSchdul.getExecutSchdulHour())
				.executSchdulMnt(batchSchdul.getExecutSchdulMnt())
				.executSchdulSecnd(batchSchdul.getExecutSchdulSecnd())
				.frstRegisterId(batchSchdul.getFrstRegisterId())
				.build();
		batchSchdulRepository.save(entity);

		if (batchSchdul.getExecutSchdulDfkSes() != null) {
			for (String dfk : batchSchdul.getExecutSchdulDfkSes()) {
				com.company.project.domain.batch.BatchSchdulDfk dfkEntity = com.company.project.domain.batch.BatchSchdulDfk
						.builder()
						.batchSchdulId(batchSchdul.getBatchSchdulId())
						.executSchdulDfkSe(dfk)
						.build();
				batchSchdulDfkRepository.save(dfkEntity);
			}
		}
	}

	/**
	 * 배치스케줄을 상세조회 한다.
	 * 
	 * @return 배치스케줄정보
	 *
	 * @param batchSchdul 조회대상 배치스케줄model
	 * @exception Exception Exception
	 */
	@Override
	public BatchSchdul selectBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		return batchSchdulRepository.findById(batchSchdul.getBatchSchdulId())
				.map(entity -> {
					BatchSchdul vo = mapToBatchSchdul(entity);
					List<com.company.project.domain.batch.BatchSchdulDfk> dfks = batchSchdulDfkRepository
							.findByIdBatchSchdulId(entity.getBatchSchdulId());
					if (!dfks.isEmpty()) {
						String[] dfkSes = new String[dfks.size()];
						for (int i = 0; i < dfks.size(); i++) {
							dfkSes[i] = dfks.get(i).getExecutSchdulDfkSe();
						}
						vo.setExecutSchdulDfkSes(dfkSes);
					}
					return vo;
				})
				.orElse(null);
	}

	/**
	 * 배치스케줄의 목록을 조회 한다.
	 * 
	 * @return 배치스케줄목록
	 *
	 * @param searchVO 조회정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BatchSchdul> selectBatchSchdulList(BatchSchdul searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		Page<Object[]> page = batchSchdulRepository.selectBatchSchdulList(
				String.valueOf(searchVO.getSearchCondition()),
				searchVO.getSearchKeyword(),
				pageable);
		return page.getContent().stream().map(row -> this.mapToBatchSchdul(row)).collect(Collectors.toList());
	}

	/**
	 * 배치스케줄 목록 전체 건수를(을) 조회한다.
	 * 
	 * @return 목록건수
	 *
	 * @param searchVO 조회할 정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBatchSchdulListCnt(BatchSchdul searchVO) throws Exception {
		return (int) batchSchdulRepository.count(); // Approximate
	}

	/**
	 * 배치스케줄정보를 수정한다.
	 *
	 * @param batchSchdul 수정대상 배치스케줄model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void updateBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		batchSchdulRepository.findById(batchSchdul.getBatchSchdulId()).ifPresent(entity -> {
			com.company.project.domain.batch.BatchSchdul updated = com.company.project.domain.batch.BatchSchdul
					.builder()
					.batchSchdulId(entity.getBatchSchdulId())
					.batchOpertId(batchSchdul.getBatchOpertId())
					.executCycle(batchSchdul.getExecutCycle())
					.executSchdulDe(batchSchdul.getExecutSchdulDe())
					.executSchdulHour(batchSchdul.getExecutSchdulHour())
					.executSchdulMnt(batchSchdul.getExecutSchdulMnt())
					.executSchdulSecnd(batchSchdul.getExecutSchdulSecnd())
					.frstRegisterId(entity.getFrstRegisterId())
					.build();
			batchSchdulRepository.save(updated);

			batchSchdulDfkRepository.deleteByIdBatchSchdulId(batchSchdul.getBatchSchdulId());
			if (batchSchdul.getExecutSchdulDfkSes() != null) {
				for (String dfk : batchSchdul.getExecutSchdulDfkSes()) {
					com.company.project.domain.batch.BatchSchdulDfk dfkEntity = com.company.project.domain.batch.BatchSchdulDfk
							.builder()
							.batchSchdulId(batchSchdul.getBatchSchdulId())
							.executSchdulDfkSe(dfk)
							.build();
					batchSchdulDfkRepository.save(dfkEntity);
				}
			}
		});
	}

	/**
	 * 배치결과를 등록한다.
	 * 
	 * @param batchResult 등록대상 배치결과model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void insertBatchResult(BatchResult batchResult) throws Exception {
		com.company.project.domain.batch.BatchResult entity = com.company.project.domain.batch.BatchResult.builder()
				.batchResultId(batchResult.getBatchResultId())
				.batchSchdulId(batchResult.getBatchSchdulId())
				.batchOpertId(batchResult.getBatchOpertId())
				.paramtr(batchResult.getParamtr())
				.sttus(batchResult.getSttus())
				.errorInfo(batchResult.getErrorInfo())
				.executBeginTime(batchResult.getExecutBeginTime())
				.executEndTime(batchResult.getExecutEndTime())
				.frstRegisterId(batchResult.getFrstRegisterId())
				.build();
		batchResultRepository.save(entity);
	}

	/**
	 * 배치결과정보를 수정한다.
	 *
	 * @param batchResult 수정대상 배치결과model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void updateBatchResult(BatchResult batchResult) throws Exception {
		batchResultRepository.findById(batchResult.getBatchResultId()).ifPresent(entity -> {
			com.company.project.domain.batch.BatchResult updated = com.company.project.domain.batch.BatchResult
					.builder()
					.batchResultId(entity.getBatchResultId())
					.batchSchdulId(entity.getBatchSchdulId())
					.batchOpertId(entity.getBatchOpertId())
					.paramtr(batchResult.getParamtr())
					.sttus(batchResult.getSttus())
					.errorInfo(batchResult.getErrorInfo())
					.executBeginTime(entity.getExecutBeginTime())
					.executEndTime(batchResult.getExecutEndTime())
					.frstRegisterId(entity.getFrstRegisterId())
					.lastUpdusrId(batchResult.getLastUpdusrId())
					.build();
			batchResultRepository.save(updated);
		});
	}

	private BatchSchdul mapToBatchSchdul(com.company.project.domain.batch.BatchSchdul entity) {
		BatchSchdul vo = new BatchSchdul();
		vo.setBatchSchdulId(entity.getBatchSchdulId());
		vo.setBatchOpertId(entity.getBatchOpertId());
		vo.setExecutCycle(entity.getExecutCycle());
		vo.setExecutSchdulDe(entity.getExecutSchdulDe());
		vo.setExecutSchdulHour(entity.getExecutSchdulHour());
		vo.setExecutSchdulMnt(entity.getExecutSchdulMnt());
		vo.setExecutSchdulSecnd(entity.getExecutSchdulSecnd());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private BatchSchdul mapToBatchSchdul(Object[] row) {
		BatchSchdul vo = new BatchSchdul();
		vo.setBatchSchdulId((String) row[0]);
		vo.setBatchOpertId((String) row[1]);
		vo.setExecutCycle((String) row[2]);
		vo.setExecutCycleNm((String) row[3]);
		vo.setExecutSchdulDe((String) row[4]);
		vo.setExecutSchdulHour((String) row[5]);
		vo.setExecutSchdulMnt((String) row[6]);
		vo.setExecutSchdulSecnd((String) row[7]);
		vo.setBatchOpertNm((String) row[8]);
		vo.setBatchProgrm((String) row[9]);
		vo.setParamtr((String) row[10]);
		return vo;
	}
}
