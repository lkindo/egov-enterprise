package egovframework.com.cop.scp.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.scrap.ScrapRepository;

import egovframework.com.cop.scp.service.EgovArticleScrapService;
import egovframework.com.cop.scp.service.Scrap;
import egovframework.com.cop.scp.service.ScrapVO;
import jakarta.annotation.Resource;

/**
 * ??????????? ????? ?????(Modernized)
 **/
@Service("EgovArticleScrapService")
public class EgovArticleScrapServiceImpl extends EgovAbstractServiceImpl implements EgovArticleScrapService {

    @Resource
    private ScrapRepository scrapRepository;

    @Resource(name = "egovScrapIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectArticleScrapList(ScrapVO scrapVO) {
        Page<com.company.project.domain.scrap.Scrap> page = scrapRepository.findByUniqIdAndUseAt(
                scrapVO.getUniqId(), "Y",
                PageRequest.of(scrapVO.getFirstIndex() / scrapVO.getRecordCountPerPage(),
                        scrapVO.getRecordCountPerPage()));

        List<ScrapVO> result = page.getContent().stream().map(this::mapToVO).collect(Collectors.toList());

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", Long.toString(page.getTotalElements()));

        return map;
    }

    @Override
    @Transactional
    public void insertArticleScrap(Scrap scrap) throws FdlException {
        String scrapId = idgenService.getNextStringId();
        com.company.project.domain.scrap.Scrap entity = com.company.project.domain.scrap.Scrap.builder()
                .scrapId(scrapId)
                .bbsId(scrap.getBbsId())
                .nttId(scrap.getNttId())
                .scrapNm(scrap.getScrapNm())
                .useAt("Y")
                .uniqId(scrap.getUniqId())
                .frstRegisterId(scrap.getFrstRegisterId())
                .build();
        scrapRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public ScrapVO selectArticleScrapDetail(ScrapVO scrapVO) {
        return scrapRepository.findById(scrapVO.getScrapId())
                .map(this::mapToVO)
                .orElse(null);
    }

    @Override
    @Transactional
    public void deleteArticleScrap(ScrapVO scrapVO) {
        scrapRepository.findById(scrapVO.getScrapId()).ifPresent(entity -> {
            entity.update(entity.getScrapNm(), "N", entity.getLastUpdusrId());
        });
    }

    @Override
    @Transactional
    public void updateArticleScrap(Scrap scrap) {
        scrapRepository.findById(scrap.getScrapId()).ifPresent(entity -> {
            entity.update(scrap.getScrapNm(), entity.getUseAt(), scrap.getLastUpdusrId());
        });
    }

    private ScrapVO mapToVO(com.company.project.domain.scrap.Scrap entity) {
        ScrapVO vo = new ScrapVO();
        vo.setScrapId(entity.getScrapId());
        vo.setBbsId(entity.getBbsId());
        vo.setNttId(entity.getNttId());
        vo.setScrapNm(entity.getScrapNm());
        vo.setUniqId(entity.getUniqId());
        return vo;
    }

}
