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

import egovframework.com.sym.bat.service.BatchResult;
import egovframework.com.sym.bat.service.EgovBatchResultService;
import jakarta.annotation.Resource;

/**
 * ??? ????ServiceImpl ?????? ???.
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
@Service("egovBatchResultService")
public class EgovBatchResultServiceImpl extends EgovAbstractServiceImpl implements EgovBatchResultService {

    @Resource
    private BatchResultRepository batchResultRepository;

    /**
     * ????????.
     * 
     * @param batchResult ????????model
     * @exception Exception Exception
     **/
    @Override
    @Transactional
    public void deleteBatchResult(BatchResult batchResult) throws Exception {
        batchResultRepository.deleteById(batchResult.getBatchResultId());
    }

    /**
     * ????????.
     * 
     * @return ??
     *
     * @param batchResult ??????model
     * @exception Exception Exception
     **/
    @Override
    public BatchResult selectBatchResult(BatchResult batchResult) throws Exception {
        return batchResultRepository.findById(batchResult.getBatchResultId())
                .map(this::mapToBatchResult)
                .orElse(null);
    }

    /**
     * ?????????.
     * 
     * @return ??
     *
     * @param searchVO ?? ?? VO
     * @exception Exception Exception
     **/
    @Override
    public List<BatchResult> selectBatchResultList(BatchResult searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                searchVO.getRecordCountPerPage());
        Page<Object[]> page = batchResultRepository.selectBatchResultList(
                searchVO.getSttus(),
                searchVO.getSearchKeywordFrom(),
                searchVO.getSearchKeywordTo(),
                String.valueOf(searchVO.getSearchCondition()),
                searchVO.getSearchKeyword(),
                pageable);
        return page.getContent().stream().map(row -> this.mapToBatchResult(row)).collect(Collectors.toList());
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
    public int selectBatchResultListCnt(BatchResult searchVO) throws Exception {
        return (int) batchResultRepository.count(); // Approximate
    }

    private BatchResult mapToBatchResult(com.company.project.domain.batch.BatchResult entity) {
        BatchResult vo = new BatchResult();
        vo.setBatchResultId(entity.getBatchResultId());
        vo.setBatchSchdulId(entity.getBatchSchdulId());
        vo.setBatchOpertId(entity.getBatchOpertId());
        vo.setParamtr(entity.getParamtr());
        vo.setSttus(entity.getSttus());
        vo.setErrorInfo(entity.getErrorInfo());
        vo.setExecutBeginTime(entity.getExecutBeginTime());
        vo.setExecutEndTime(entity.getExecutEndTime());
        vo.setLastUpdusrId(entity.getLastUpdusrId());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        return vo;
    }

    private BatchResult mapToBatchResult(Object[] row) {
        BatchResult vo = new BatchResult();
        vo.setBatchResultId((String) row[0]);
        vo.setBatchSchdulId((String) row[1]);
        vo.setBatchOpertId((String) row[2]);
        vo.setBatchOpertNm((String) row[3]);
        vo.setBatchProgrm((String) row[4]);
        vo.setParamtr((String) row[5]);
        vo.setSttus((String) row[6]);
        vo.setSttusNm((String) row[7]);
        vo.setErrorInfo((String) row[8]);
        vo.setExecutBeginTime((String) row[9]);
        vo.setExecutEndTime((String) row[10]);
        return vo;
    }
}
