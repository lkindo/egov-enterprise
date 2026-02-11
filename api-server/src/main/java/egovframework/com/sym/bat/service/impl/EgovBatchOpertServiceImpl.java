package egovframework.com.sym.bat.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.batch.BatchJob;
import com.company.project.domain.batch.BatchJobRepository;

import egovframework.com.sym.bat.service.BatchOpert;
import egovframework.com.sym.bat.service.EgovBatchOpertService;
import jakarta.annotation.Resource;

/**
 * 배치작업관리에 대한 ServiceImpl 클래스를 정의한다.
 * 리팩토링: 중복 엔티티 제거를 위해 BatchJobRepository를 사용하도록 통합됨.
 */
@Service("egovBatchOpertService")
public class EgovBatchOpertServiceImpl extends EgovAbstractServiceImpl implements EgovBatchOpertService {

	@Resource
	private BatchJobRepository batchJobRepository;

	@Override
	@Transactional
	public void deleteBatchOpert(BatchOpert batchOpert) throws Exception {
		batchJobRepository.findById(batchOpert.getBatchOpertId()).ifPresent(entity -> {
			BatchJob updated = BatchJob.builder()
					.batchOpertId(entity.getBatchOpertId())
					.batchOpertNm(entity.getBatchOpertNm())
					.batchProgrm(entity.getBatchProgrm())
					.paramtr(entity.getParamtr())
					.useAt("N")
					.frstRegisterId(entity.getFrstRegisterId())
					.build();
			batchJobRepository.save(updated);
		});
	}

	@Override
	@Transactional
	public void insertBatchOpert(BatchOpert batchOpert) throws Exception {
		BatchJob entity = BatchJob.builder()
				.batchOpertId(batchOpert.getBatchOpertId())
				.batchOpertNm(batchOpert.getBatchOpertNm())
				.batchProgrm(batchOpert.getBatchProgrm())
				.paramtr(batchOpert.getParamtr())
				.useAt("Y")
				.frstRegisterId(batchOpert.getFrstRegisterId())
				.build();
		batchJobRepository.save(entity);
	}

	@Override
	public BatchOpert selectBatchOpert(BatchOpert batchOpert) throws Exception {
		return batchJobRepository.findById(batchOpert.getBatchOpertId())
				.map(this::mapToBatchOpert)
				.orElse(null);
	}

	@Override
	public List<BatchOpert> selectBatchOpertList(BatchOpert searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		
		Page<BatchJob> page = batchJobRepository.search(
				String.valueOf(searchVO.getSearchCondition()),
				searchVO.getSearchKeyword(),
				pageable);
				
		return page.getContent().stream().map(this::mapToBatchOpert).collect(Collectors.toList());
	}

	@Override
	public int selectBatchOpertListCnt(BatchOpert searchVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		Page<BatchJob> page = batchJobRepository.search(
				String.valueOf(searchVO.getSearchCondition()),
				searchVO.getSearchKeyword(),
				pageable);
		return (int) page.getTotalElements();
	}

	@Override
	@Transactional
	public void updateBatchOpert(BatchOpert batchOpert) throws Exception {
		batchJobRepository.findById(batchOpert.getBatchOpertId()).ifPresent(entity -> {
			entity.update(batchOpert.getBatchOpertNm(), batchOpert.getBatchProgrm(), 
					batchOpert.getParamtr(), "Y", entity.getFrstRegisterId());
			batchJobRepository.save(entity);
		});
	}

	private BatchOpert mapToBatchOpert(BatchJob entity) {
		BatchOpert vo = new BatchOpert();
		vo.setBatchOpertId(entity.getBatchOpertId());
		vo.setBatchOpertNm(entity.getBatchOpertNm());
		vo.setBatchProgrm(entity.getBatchProgrm());
		vo.setParamtr(entity.getParamtr());
		vo.setUseAt(entity.getUseAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}

}
