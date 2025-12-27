package egovframework.let.sym.ccm.cca.service.impl;

import com.company.project.domain.code.CommonCodeGroup;
import com.company.project.domain.code.CommonCodeGroupRepository;
import egovframework.let.sym.ccm.cca.service.CmmnCode;
import egovframework.let.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.let.sym.ccm.cca.service.EgovCcmCmmnCodeManageService;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 공통코드에 대한 서비스 구현클래스 (JPA 전환)
 */
@Service("CmmnCodeManageService")
@Transactional(readOnly = true)
public class EgovCcmCmmnCodeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmCmmnCodeManageService {

    @Resource
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @Override
    @Transactional
    public void deleteCmmnCode(CmmnCode cmmnCode) throws Exception {
        commonCodeGroupRepository.findById(cmmnCode.getCodeId())
                .ifPresent(entity -> entity.delete());
    }

    @Override
    @Transactional
    public void insertCmmnCode(CmmnCode cmmnCode) throws Exception {
        CommonCodeGroup entity = CommonCodeGroup.builder()
                .codeId(cmmnCode.getCodeId())
                .codeIdNm(cmmnCode.getCodeIdNm())
                .codeIdDc(cmmnCode.getCodeIdDc())
                .clCode(cmmnCode.getClCode())
                .useAt(cmmnCode.getUseAt())
                .frstRegisterId(cmmnCode.getFrstRegisterId())
                .build();
        commonCodeGroupRepository.save(entity);
    }

    @Override
    public CmmnCode selectCmmnCodeDetail(CmmnCode cmmnCode) throws Exception {
        return commonCodeGroupRepository.findById(cmmnCode.getCodeId())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<?> selectCmmnCodeList(CmmnCodeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                searchVO.getRecordCountPerPage());
        Page<CommonCodeGroup> result = commonCodeGroupRepository.searchCommonCodeGroups(searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public int selectCmmnCodeListTotCnt(CmmnCodeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<CommonCodeGroup> result = commonCodeGroupRepository.searchCommonCodeGroups(searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    @Override
    @Transactional
    public void updateCmmnCode(CmmnCode cmmnCode) throws Exception {
        commonCodeGroupRepository.findById(cmmnCode.getCodeId())
                .ifPresent(entity -> {
                    entity.update(cmmnCode.getCodeIdNm(), cmmnCode.getCodeIdDc(), cmmnCode.getUseAt(),
                            cmmnCode.getLastUpdusrId());
                });
    }

    private CmmnCode convertToVo(CommonCodeGroup entity) {
        CmmnCode vo = new CmmnCode();
        vo.setCodeId(entity.getCodeId());
        vo.setCodeIdNm(entity.getCodeIdNm());
        vo.setCodeIdDc(entity.getCodeIdDc());
        vo.setClCode(entity.getClCode());
        vo.setUseAt(entity.getUseAt());
        return vo;
    }
}
