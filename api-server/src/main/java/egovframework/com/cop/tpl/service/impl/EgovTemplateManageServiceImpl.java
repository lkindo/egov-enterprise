package egovframework.com.cop.tpl.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.template.Template;
import com.company.project.domain.template.TemplateRepository;

import egovframework.com.cop.tpl.service.EgovTemplateManageService;
import egovframework.com.cop.tpl.service.TemplateInf;
import egovframework.com.cop.tpl.service.TemplateInfVO;
import jakarta.annotation.Resource;

/**
 * 템플릿 정보 관리를 위한 서비스 구현 클래스
 * Refactored to use JPA (TemplateRepository)
 */
@Service("EgovTemplateManageService")
public class EgovTemplateManageServiceImpl extends EgovAbstractServiceImpl implements EgovTemplateManageService {

    @Resource(name = "commonTemplateRepository")
    private TemplateRepository templateRepository;

    @Resource(name = "TemplateManageDAO")
    private TemplateManageDAO tmplatDAO;

    /**
     * 템플릿 정보를 삭제한다.
     */
    @Override
    @Transactional
    public void deleteTemplateInf(TemplateInf tmplatInf) throws Exception {
        templateRepository.findById(tmplatInf.getTmplatId()).ifPresent(entity -> {
            // Usually logical delete
            Template updated = Template.builder()
                    .tmplatId(entity.getTmplatId())
                    .tmplatNm(entity.getTmplatNm())
                    .tmplatCours(entity.getTmplatCours())
                    .tmplatSeCode(entity.getTmplatSeCode())
                    .useAt("N")
                    .frstRegisterId(entity.getFrstRegisterId())
                    .build();
            templateRepository.save(updated);
        });
    }

    /**
     * 템플릿 정보를 등록한다.
     */
    @Override
    @Transactional
    public void insertTemplateInf(TemplateInf tmplatInf) throws Exception {
        Template entity = Template.builder()
                .tmplatId(tmplatInf.getTmplatId())
                .tmplatNm(tmplatInf.getTmplatNm())
                .tmplatSeCode(tmplatInf.getTmplatSeCode())
                .tmplatCours(tmplatInf.getTmplatCours())
                .useAt(tmplatInf.getUseAt())
                .frstRegisterId(tmplatInf.getFrstRegisterId())
                .build();
        templateRepository.save(entity);
    }

    /**
     * 템플릿 정보를 수정한다.
     */
    @Override
    @Transactional
    public void updateTemplateInf(TemplateInf tmplatInf) throws Exception {
        templateRepository.findById(tmplatInf.getTmplatId()).ifPresent(entity -> {
            entity.update(tmplatInf.getTmplatNm(), tmplatInf.getTmplatCours(),
                    tmplatInf.getTmplatSeCode(), tmplatInf.getUseAt(), tmplatInf.getLastUpdusrId());
        });
    }

    /**
     * 템플릿에 대한 상세정보를 조회한다.
     */
    @Override
    public TemplateInfVO selectTemplateInf(TemplateInfVO tmplatInfVO) throws Exception {
        return templateRepository.findById(tmplatInfVO.getTmplatId())
                .map(this::toVO)
                .orElse(null);
    }

    /**
     * 템플릿 목록을 조회한다.
     */
    @Override
    public Map<String, Object> selectTemplateInfs(TemplateInfVO tmplatInfVO) throws Exception {
        Pageable pageable = PageRequest.of(tmplatInfVO.getFirstIndex() / tmplatInfVO.getRecordCountPerPage(),
                tmplatInfVO.getRecordCountPerPage(), Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));

        Page<Template> page;
        if ("0".equals(tmplatInfVO.getSearchCnd())) {
            page = templateRepository.findByTmplatNmContaining(tmplatInfVO.getSearchWrd(), pageable);
        } else {
            page = templateRepository.findAll(pageable);
        }

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
        map.put("resultCnt", Long.toString(page.getTotalElements()));

        return map;
    }

    /**
     * 템플릿에 대한 목록 전체 건수를 조회한다.
     */
    @Override
    public int selectTemplateInfsCnt(TemplateInfVO tmplatInfVO) throws Exception {
        return (int) templateRepository.count();
    }

    /**
     * 템플릿에 대한 외화이트 리스트를 조회한다.
     */
    @Override
    public List<TemplateInfVO> selectTemplateWhiteList() throws Exception {
        return templateRepository.findByUseAt("Y").stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    /**
     * 동일 유형의 템플릿 목록을 조회한다.
     */
    @Override
    public List<TemplateInfVO> selectTemplateInfsByCode(TemplateInfVO tmplatInfVO) throws Exception {
        return templateRepository.findByTmplatSeCodeAndUseAt(tmplatInfVO.getTmplatSeCode(), "Y").stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    private TemplateInfVO toVO(Template entity) {
        TemplateInfVO vo = new TemplateInfVO();
        vo.setTmplatId(entity.getTmplatId());
        vo.setTmplatNm(entity.getTmplatNm());
        vo.setTmplatSeCode(entity.getTmplatSeCode());
        vo.setTmplatCours(entity.getTmplatCours());
        vo.setUseAt(entity.getUseAt());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        return vo;
    }
}
