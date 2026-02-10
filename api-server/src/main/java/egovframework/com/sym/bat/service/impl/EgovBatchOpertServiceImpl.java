package egovframework.com.sym.bat.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.batch.BatchOpertRepository;

import egovframework.com.sym.bat.service.BatchOpert;
import egovframework.com.sym.bat.service.EgovBatchOpertService;
import jakarta.annotation.Resource;

/**
 * 배치작업관리에 대한 ServiceImpl 클래스를 정의한다.
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
@Service("egovBatchOpertService")
public class EgovBatchOpertServiceImpl extends EgovAbstractServiceImpl implements EgovBatchOpertService {

	@Resource
	private BatchOpertRepository batchOpertRepository;

	/**
	 * 배치작업을 삭제한다.
	 * 
	 * @param batchOpert 삭제대상 배치작업model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void deleteBatchOpert(BatchOpert batchOpert) throws Exception {
		batchOpertRepository.findById(batchOpert.getBatchOpertId()).ifPresent(entity -> {
			entity.delete(); // useAt = 'N'
			batchOpertRepository.save(entity);
		});
	}

	/**
	 * 배치작업을 등록한다.
	 * 
	 * @param batchOpert 등록대상 배치작업model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void insertBatchOpert(BatchOpert batchOpert) throws Exception {
		com.company.project.domain.batch.BatchOpert entity = com.company.project.domain.batch.BatchOpert.builder()
				.batchOpertId(batchOpert.getBatchOpertId())
				.batchOpertNm(batchOpert.getBatchOpertNm())
				.batchProgrm(batchOpert.getBatchProgrm())
				.paramtr(batchOpert.getParamtr())
				.useAt("Y")
				.frstRegisterId(batchOpert.getFrstRegisterId())
				.build();
		batchOpertRepository.save(entity);
	}

	/**
	 * 배치작업을 상세조회 한다.
	 * 
	 * @return 배치작업정보
	 *
	 * @param batchOpert 조회대상 배치작업model
	 * @exception Exception Exception
	 */
	@Override
	public BatchOpert selectBatchOpert(BatchOpert batchOpert) throws Exception {
		return batchOpertRepository.findById(batchOpert.getBatchOpertId())
				.map(this::mapToBatchOpert)
				.orElse(null);
	}

	/**
	 * 배치작업의 목록을 조회 한다.
	 * 
	 * @return 배치작업목록
	 *
	 * @param searchVO 조회정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BatchOpert> selectBatchOpertList(BatchOpert searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		Page<com.company.project.domain.batch.BatchOpert> page = batchOpertRepository.selectBatchOpertList(
				String.valueOf(searchVO.getSearchCondition()),
				searchVO.getSearchKeyword(),
				pageable);
		return page.getContent().stream().map(this::mapToBatchOpert).collect(Collectors.toList());
	}

	/**
	 * 배치작업 목록 전체 건수를(을) 조회한다.
	 * 
	 * @return 목록건수
	 *
	 * @param searchVO 조회할 정보가 담긴 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBatchOpertListCnt(BatchOpert searchVO) throws Exception {
		return (int) batchOpertRepository.count(); // Approximate
	}

	/**
	 * 배치작업정보를 수정한다.
	 *
	 * @param batchOpert 수정대상 배치작업model
	 * @exception Exception Exception
	 */
	@Override
	@Transactional
	public void updateBatchOpert(BatchOpert batchOpert) throws Exception {
		batchOpertRepository.findById(batchOpert.getBatchOpertId()).ifPresent(entity -> {
			com.company.project.domain.batch.BatchOpert updated = com.company.project.domain.batch.BatchOpert.builder()
					.batchOpertId(entity.getBatchOpertId())
					.batchOpertNm(batchOpert.getBatchOpertNm())
					.batchProgrm(batchOpert.getBatchProgrm())
					.paramtr(batchOpert.getParamtr())
					.useAt("Y")
					.frstRegisterId(entity.getFrstRegisterId())
					.build();
			batchOpertRepository.save(updated);
		});
	}

	private BatchOpert mapToBatchOpert(com.company.project.domain.batch.BatchOpert entity) {
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