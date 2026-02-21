package egovframework.com.sym.bat.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.batch.BatchOpert;
import com.company.project.domain.batch.BatchOpertRepository;

import egovframework.com.sym.bat.service.EgovBatchOpertService;
import jakarta.annotation.Resource;

/**
 * ???? ????????? ?????
 **/
@Service("egovBatchOpertService")
public class EgovBatchOpertServiceImpl extends EgovAbstractServiceImpl implements EgovBatchOpertService {

	@Resource(name = "batchOpertRepository")
	private BatchOpertRepository batchOpertRepository;

	@Resource(name = "egovBatchOpertIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public void deleteBatchOpert(egovframework.com.sym.bat.service.BatchOpert batchOpertVO) throws Exception {
		batchOpertRepository.deleteById(batchOpertVO.getBatchOpertId());
	}

	@Override
	public void insertBatchOpert(egovframework.com.sym.bat.service.BatchOpert batchOpertVO) throws Exception {
		String id = idgenService.getNextStringId();
		batchOpertVO.setBatchOpertId(id);

		BatchOpert entity = BatchOpert.builder()
				.batchOpertId(id)
				.batchOpertNm(batchOpertVO.getBatchOpertNm())
				.batchProgrm(batchOpertVO.getBatchProgrm())
				.paramtr(batchOpertVO.getParamtr())
				.useAt("Y")
				.frstRegisterId(batchOpertVO.getFrstRegisterId())
				.build();

		batchOpertRepository.save(entity);
	}

	@Override
	public egovframework.com.sym.bat.service.BatchOpert selectBatchOpert(
			egovframework.com.sym.bat.service.BatchOpert batchOpertVO) throws Exception {
		return batchOpertRepository.findById(batchOpertVO.getBatchOpertId())
				.map(this::mapToVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<egovframework.com.sym.bat.service.BatchOpert> selectBatchOpertList(
			egovframework.com.sym.bat.service.BatchOpert searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<BatchOpert> page = batchOpertRepository.searchBatchOperts(searchVO.getSearchCondition(),
				searchVO.getSearchKeyword(), pageable);
		return page.getContent().stream().map(this::mapToVO).collect(Collectors.toList());
	}

	@Override
	public int selectBatchOpertListCnt(egovframework.com.sym.bat.service.BatchOpert searchVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) batchOpertRepository
				.searchBatchOperts(searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
				.getTotalElements();
	}

	@Override
	public void updateBatchOpert(egovframework.com.sym.bat.service.BatchOpert batchOpertVO) throws Exception {
		batchOpertRepository.findById(batchOpertVO.getBatchOpertId()).ifPresent(entity -> {
			entity.update(batchOpertVO.getBatchOpertNm(), batchOpertVO.getBatchProgrm(),
					batchOpertVO.getParamtr(), "Y", batchOpertVO.getLastUpdusrId());
			batchOpertRepository.save(entity);
		});
	}

	private egovframework.com.sym.bat.service.BatchOpert mapToVO(BatchOpert entity) {
		egovframework.com.sym.bat.service.BatchOpert vo = new egovframework.com.sym.bat.service.BatchOpert();
		vo.setBatchOpertId(entity.getBatchOpertId());
		vo.setBatchOpertNm(entity.getBatchOpertNm());
		vo.setBatchProgrm(entity.getBatchProgrm());
		vo.setParamtr(entity.getParamtr());
		vo.setUseAt(entity.getUseAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}
}
