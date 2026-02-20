package egovframework.com.cop.smt.wmr.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.report.WorkReport;
import com.company.project.domain.report.WorkReportRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;

import egovframework.com.cop.smt.wmr.service.EgovWikMnthngReprtService;
import egovframework.com.cop.smt.wmr.service.ReportrVO;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprt;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprtVO;
import jakarta.annotation.Resource;

/**
 * ????????ServiceImpl ?????? ???. (Modernized)
 **/
@Service("EgovWikMnthngReprtService")
public class EgovWikMnthngReprtServiceImpl extends EgovAbstractServiceImpl implements EgovWikMnthngReprtService {

    @Resource
    private WorkReportRepository workReportRepository;

    @Resource
    private UserRepository userRepository;

    @Resource(name = "egovWikMnthngReprtIdGnrService")
    private EgovIdGnrService idgenServiceWikMnthngReprt;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception {
        // Implement using userRepository
        return new HashMap<>();
    }

    @Override
    @Transactional(readOnly = true)
    public String selectWrterClsfNm(String wrterId) throws Exception {
        return userRepository.findByEsntlId(wrterId)
                .map(User::getOfcpsNm)
                .orElse("");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectWikMnthngReprtList(WikMnthngReprtVO vo) throws Exception {
        Page<WorkReport> page = workReportRepository.searchWorkReports(
                vo.getSearchId(), vo.getSearchDe(), vo.getSearchBgnDe(), vo.getSearchEndDe(),
                vo.getSearchCnd(), vo.getSearchWrd(), vo.getSearchSttus(), vo.getSearchSe(),
                PageRequest.of(vo.getFirstIndex() / vo.getRecordCountPerPage(), vo.getRecordCountPerPage()));

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(this::mapToVO).collect(Collectors.toList()));
        map.put("resultCnt", Long.toString(page.getTotalElements()));
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public WikMnthngReprtVO selectWikMnthngReprt(WikMnthngReprtVO vo) throws Exception {
        return workReportRepository.findById(vo.getReprtId())
                .map(this::mapToVO)
                .orElse(null);
    }

    @Override
    @Transactional
    public void updateWikMnthngReprt(WikMnthngReprt report) throws Exception {
        workReportRepository.findById(report.getReprtId()).ifPresent(entity -> {
            entity.update(report.getReprtSj(), entity.getReportContent(), report.getReprtSe(), report.getReprtDe(),
                    entity.getReportStatus(), report.getLastUpdusrId());
        });
    }

    @Override
    @Transactional
    public void insertWikMnthngReprt(WikMnthngReprt report) throws Exception {
        report.setReprtId(idgenServiceWikMnthngReprt.getNextStringId());
        WorkReport entity = WorkReport.builder()
                .reportId(report.getReprtId())
                .reportSubject(report.getReprtSj())
                .reportType(report.getReprtSe())
                .reportDate(report.getReprtDe())
                .writerId(report.getWrterId())
                .frstRegisterId(report.getFrstRegisterId())
                .build();
        workReportRepository.save(entity);
    }

    @Override
    @Transactional
    public void confirmWikMnthngReprt(WikMnthngReprt report) throws Exception {
        // Implementation for confirmation
    }

    @Override
    @Transactional
    public void deleteWikMnthngReprt(WikMnthngReprt report) throws Exception {
        workReportRepository.deleteById(report.getReprtId());
    }

    private WikMnthngReprtVO mapToVO(WorkReport entity) {
        WikMnthngReprtVO vo = new WikMnthngReprtVO();
        vo.setReprtId(entity.getReportId());
        vo.setReprtSj(entity.getReportSubject());
        vo.setReprtSe(entity.getReportType());
        vo.setReprtDe(entity.getReportDate());
        vo.setWrterId(entity.getWriterId());
        return vo;
    }
}
