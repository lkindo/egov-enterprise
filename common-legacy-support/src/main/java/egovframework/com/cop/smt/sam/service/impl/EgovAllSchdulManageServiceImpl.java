package egovframework.com.cop.smt.sam.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.schedule.Schedule;
import com.company.project.domain.schedule.ScheduleRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.smt.sam.service.EgovAllSchdulManageService;
import jakarta.annotation.Resource;

/**
 * ???????? ServiceImpl Class ? (Modernized)
 **/
@Service("egovAllSchdulManageService")
public class EgovAllSchdulManageServiceImpl extends EgovAbstractServiceImpl implements EgovAllSchdulManageService {

    @Resource
    private ScheduleRepository scheduleRepository;

    /**
     * ??? ?????.
     **/
    @Override
    @Transactional(readOnly = true)
    public List<EgovMap> selectAllSchdulManageeList(ComDefaultVO searchVO) throws Exception {
        Page<Schedule> page = scheduleRepository.findAll(
                PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                        searchVO.getRecordCountPerPage()));

        return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
    }

    /**
     * ??????? ?? ???? ???.
     **/
    @Override
    @Transactional(readOnly = true)
    public int selectAllSchdulManageListCnt(ComDefaultVO searchVO) throws Exception {
        return (int) scheduleRepository.count();
    }

    private EgovMap toEgovMap(Schedule entity) {
        EgovMap map = new EgovMap();
        map.put("schdulId", entity.getSchdulId());
        map.put("schdulNm", entity.getSchdulNm());
        // Map other fields
        return map;
    }

}
