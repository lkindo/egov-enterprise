package egovframework.let.cop.com.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.board.Template;
import com.company.project.domain.board.TemplateRepository;

import egovframework.let.cop.com.service.EgovTemplateManageService;
import egovframework.let.cop.com.service.TemplateInf;
import egovframework.let.cop.com.service.TemplateInfVO;
import lombok.RequiredArgsConstructor;

/**
 * 템플릿 관리를 위한 서비스 구현 클래스 (JPA)
 */
@Service("EgovTemplateManageService")
@RequiredArgsConstructor
public class EgovTemplateManageServiceImpl extends EgovAbstractServiceImpl implements EgovTemplateManageService {

    private final TemplateRepository templateRepository;

    @Override
    @Transactional
    public void deleteTemplateInf(TemplateInf tmplatInf) throws Exception {
        templateRepository.findById(tmplatInf.getTmplatId()).ifPresent(entity -> {
            entity.setUseAt("N");
        });
    }

    @Override
    @Transactional
    public void insertTemplateInf(TemplateInf tmplatInf) throws Exception {
        Template entity = Template.builder()
                .tmplatId(tmplatInf.getTmplatId())
                .tmplatNm(tmplatInf.getTmplatNm())
                .tmplatCours(tmplatInf.getTmplatCours())
                .tmplatSeCode(tmplatInf.getTmplatSeCode())
                .useAt("Y")
                .build();
        templateRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public TemplateInfVO selectTemplateInf(TemplateInfVO tmplatInfVO) throws Exception {
        return templateRepository.findById(tmplatInfVO.getTmplatId())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectTemplateInfs(TemplateInfVO tmplatInfVO) throws Exception {
        List<Template> result = templateRepository.findAll();
        Map<String, Object> map = new HashMap<>();
        map.put("resultList", convertToVoList(result));
        map.put("resultCnt", String.valueOf(result.size()));
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TemplateInfVO> selectTemplateInfsByCode(TemplateInfVO tmplatInfVO) throws Exception {
        List<Template> result = templateRepository.findAll();
        return convertToVoList(result);
    }

    @Override
    @Transactional(readOnly = true)
    public TemplateInfVO selectTemplatePreview(TemplateInfVO tmplatInfVO) throws Exception {
        return selectTemplateInf(tmplatInfVO);
    }

    @Override
    @Transactional
    public void updateTemplateInf(TemplateInf tmplatInf) throws Exception {
        templateRepository.findById(tmplatInf.getTmplatId()).ifPresent(entity -> {
            entity.setTmplatNm(tmplatInf.getTmplatNm());
            entity.setTmplatCours(tmplatInf.getTmplatCours());
            entity.setTmplatSeCode(tmplatInf.getTmplatSeCode());
            entity.setUseAt(tmplatInf.getUseAt());
        });
    }

    private TemplateInfVO convertToVo(Template entity) {
        TemplateInfVO vo = new TemplateInfVO();
        vo.setTmplatId(entity.getTmplatId());
        vo.setTmplatNm(entity.getTmplatNm());
        vo.setTmplatCours(entity.getTmplatCours());
        vo.setTmplatSeCode(entity.getTmplatSeCode());
        vo.setUseAt(entity.getUseAt());
        return vo;
    }

    private List<TemplateInfVO> convertToVoList(List<Template> entities) {
        List<TemplateInfVO> list = new ArrayList<>();
        for (Template e : entities) {
            list.add(convertToVo(e));
        }
        return list;
    }
}
