package egovframework.let.sym.cal.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.calendar.RestdeRepository;

import egovframework.let.sym.cal.service.EgovCalRestdeManageService;
import egovframework.let.sym.cal.service.Restde;
import egovframework.let.sym.cal.service.RestdeVO;
import lombok.RequiredArgsConstructor;

/**
 * 휴일에 대한 서비스 구현클래스 (JPA)
 */
@Service("RestdeManageService")
@RequiredArgsConstructor
public class EgovCalRestdeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCalRestdeManageService {

    private final RestdeRepository restdeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<?> selectNormalRestdePopup(Restde restde) throws Exception {
        String yearMonth = restde.getYear() + restde.getMonth();
        return convertToVoList(restdeRepository.findByRestdeDeStartingWith(yearMonth));
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectAdministRestdePopup(Restde restde) throws Exception {
        return selectNormalRestdePopup(restde);
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectNormalDayCal(Restde restde) throws Exception {
        return new ArrayList<>();
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectNormalDayRestde(Restde restde) throws Exception {
        String date = restde.getYear() + restde.getMonth() + restde.getDay();
        return convertToVoList(restdeRepository.findByRestdeDeStartingWith(date));
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectNormalMonthRestde(Restde restde) throws Exception {
        String yearMonth = restde.getYear() + restde.getMonth();
        return convertToVoList(restdeRepository.findByRestdeDeStartingWith(yearMonth));
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectAdministDayCal(Restde restde) throws Exception {
        return selectNormalDayCal(restde);
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectAdministDayRestde(Restde restde) throws Exception {
        return selectNormalDayRestde(restde);
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectAdministMonthRestde(Restde restde) throws Exception {
        return selectNormalMonthRestde(restde);
    }

    @Override
    @Transactional
    public void deleteRestde(Restde restde) throws Exception {
        restdeRepository.deleteById(restde.getRestdeNo());
    }

    @Override
    @Transactional
    public void insertRestde(Restde restde) throws Exception {
        com.company.project.domain.calendar.Restde entity = com.company.project.domain.calendar.Restde.builder()
                .restdeDe(restde.getRestdeDe())
                .restdeNm(restde.getRestdeNm())
                .restdeDc(restde.getRestdeDc())
                .restdeSeCode(restde.getRestdeSeCode())
                .frstRegisterId(restde.getFrstRegisterId())
                .lastUpdusrId(restde.getLastUpdusrId())
                .build();
        restdeRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Restde selectRestdeDetail(Restde restde) throws Exception {
        return restdeRepository.findById(restde.getRestdeNo())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectRestdeList(RestdeVO searchVO) throws Exception {
        String yearMonth = searchVO.getSearchYear() + searchVO.getSearchMonth();
        return convertToVoList(restdeRepository.findByRestdeDeStartingWith(yearMonth));
    }

    @Override
    @Transactional(readOnly = true)
    public int selectRestdeListTotCnt(RestdeVO searchVO) throws Exception {
        String yearMonth = searchVO.getSearchYear() + searchVO.getSearchMonth();
        return restdeRepository.findByRestdeDeStartingWith(yearMonth).size();
    }

    @Override
    @Transactional
    public void updateRestde(Restde restde) throws Exception {
        restdeRepository.findById(restde.getRestdeNo())
                .ifPresent(entity -> entity.update(restde.getRestdeDe(), restde.getRestdeNm(), restde.getRestdeDc(),
                        restde.getRestdeSeCode(), restde.getLastUpdusrId()));
    }

    private Restde convertToVo(com.company.project.domain.calendar.Restde entity) {
        Restde vo = new Restde();
        vo.setRestdeNo(entity.getRestdeNo());
        vo.setRestdeDe(entity.getRestdeDe());
        vo.setRestdeNm(entity.getRestdeNm());
        vo.setRestdeDc(entity.getRestdeDc());
        vo.setRestdeSeCode(entity.getRestdeSeCode());
        return vo;
    }

    private List<Restde> convertToVoList(List<com.company.project.domain.calendar.Restde> entities) {
        List<Restde> list = new ArrayList<>();
        for (com.company.project.domain.calendar.Restde e : entities) {
            list.add(convertToVo(e));
        }
        return list;
    }
}
