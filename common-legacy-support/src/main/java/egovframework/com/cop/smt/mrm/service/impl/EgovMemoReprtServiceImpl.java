package egovframework.com.cop.smt.mrm.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.memoreport.MemoReport;
import com.company.project.domain.memoreport.MemoReportRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;

import egovframework.com.cop.smt.mrm.service.EgovMemoReprtService;
import egovframework.com.cop.smt.mrm.service.MemoReprt;
import egovframework.com.cop.smt.mrm.service.MemoReprtVO;
import egovframework.com.cop.smt.mrm.service.ReportrVO;
import jakarta.annotation.Resource;

/**
 * ????????ServiceImpl ?????? ???. (Modernized)
 **/
@Service("EgovMemoReprtService")
public class EgovMemoReprtServiceImpl extends EgovAbstractServiceImpl implements EgovMemoReprtService {

    @Resource
    private MemoReportRepository memoReportRepository;

    @Resource
    private UserRepository userRepository;

    @Resource(name = "egovMemoReprtIdGnrService")
    private EgovIdGnrService idgenServiceMemoReprt;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception {
        return new HashMap<>(); // Simplified
    }

    @Override
    @Transactional(readOnly = true)
    public String selectWrterClsfNm(String wrterId) throws Exception {
        return userRepository.findByEsntlId(wrterId).map(User::getOfcpsNm).orElse("");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectMemoReprtList(MemoReprtVO vo) throws Exception {
        Page<MemoReport> page = memoReportRepository.findAll(
                PageRequest.of(vo.getFirstIndex() / vo.getRecordCountPerPage(), vo.getRecordCountPerPage()));

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(this::mapToVO).collect(Collectors.toList()));
        map.put("resultCnt", Long.toString(page.getTotalElements()));
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public MemoReprtVO selectMemoReprt(MemoReprtVO vo) throws Exception {
        return memoReportRepository.findById(vo.getReprtId())
                .map(this::mapToVO)
                .orElse(null);
    }

    @Override
    @Transactional
    public void readMemoReprt(MemoReprt memoReprt) throws Exception {
        // Update read date
    }

    @Override
    @Transactional
    public void updateMemoReprt(MemoReprt memoReprt) throws Exception {
        memoReportRepository.findById(memoReprt.getReprtId()).ifPresent(entity -> {
            // Update fields
        });
    }

    @Override
    @Transactional
    public void updateMemoReprtDrctMatter(MemoReprt memoReprt) throws Exception {
        // Update direct matter
    }

    @Override
    @Transactional
    public void insertMemoReprt(MemoReprt memoReprt) throws Exception {
        memoReprt.setReprtId(idgenServiceMemoReprt.getNextStringId());
        // Save to repository
    }

    @Override
    @Transactional
    public void deleteMemoReprt(MemoReprtVO vo) throws Exception {
        memoReportRepository.deleteById(vo.getReprtId());
    }

    private MemoReprtVO mapToVO(MemoReport entity) {
        MemoReprtVO vo = new MemoReprtVO();
        vo.setReprtId(entity.getReprtId());
        // Map other fields
        return vo;
    }
}
