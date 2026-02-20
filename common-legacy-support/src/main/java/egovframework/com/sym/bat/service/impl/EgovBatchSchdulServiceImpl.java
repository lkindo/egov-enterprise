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
 * ?????? ????ServiceImpl ?????? ???.
 *
 * @author ?
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?? 10:27:13
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ?    ????
 *      </pre>
 **/
@Service("egovBatchSchdulService")
public class EgovBatchSchdulServiceImpl extends EgovAbstractServiceImpl implements EgovBatchSchdulService {

	@Resource
	private BatchSchdulRepository batchSchdulRepository;

	@Resource
	private BatchResultRepository batchResultRepository;

	@Resource
	private BatchSchdulDfkRepository batchSchdulDfkRepository;

	/**
	 * ???????????.
	 * 
	 * @param batchSchdul ???????????odel
	 * @exception Exception Exception
	 **/
	@Override
	@Transactional
	public void deleteBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		batchSchdulDfkRepository.deleteByIdBatchSchdulId(batchSchdul.getBatchSchdulId());
		batchSchdulRepository.deleteById(batchSchdul.getBatchSchdulId());
	}

	/**
	 * ?????????.
	 * 
	 * @param batchSchdul ?????????odel
	 * @exception Exception Exception
	 **/
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
	 * ???????????.
	 * 
	 * @return ??????
	 *
	 * @param batchSchdul ?????????odel
	 * @exception Exception Exception
	 **/
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
	 * ????????????.
	 * 
	 * @return ??????
	 *
	 * @param searchVO ?? ?? VO
	 * @exception Exception Exception
	 **/
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
	 * ??????? ???? ???.
	 * 
	 * @return ?
	 *
	 * @param searchVO ???? ?? VO
	 * @exception Exception Exception
	 **/
	@Override
	public int selectBatchSchdulListCnt(BatchSchdul searchVO) throws Exception {
		return (int) batchSchdulRepository.count(); // Approximate
	}

	/**
	 * ??????? ????.
	 *
	 * @param batchSchdul ??????????odel
	 * @exception Exception Exception
	 **/
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
	 * ??????.
	 * 
	 * @param batchResult ??????model
	 * @exception Exception Exception
	 **/
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
	 * ????????.
	 *
	 * @param batchResult ???????model
	 * @exception Exception Exception
	 **/
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
