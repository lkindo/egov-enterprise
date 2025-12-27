package egovframework.let.sym.ccm.cde.service.impl;

import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeId;
import com.company.project.domain.code.CommonCodeRepository;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.let.sym.ccm.cde.service.CmmnDetailCodeVO;
import egovframework.let.sym.ccm.cde.service.EgovCcmCmmnDetailCodeManageService;
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
 * 공통상세코드에 대한 서비스 구현클래스 (JPA 전환)
 */
@Service("CmmnDetailCodeManageService")
@Transactional(readOnly = true)
public class EgovCcmCmmnDetailCodeManageServiceImpl extends EgovAbstractServiceImpl
        implements EgovCcmCmmnDetailCodeManageService {

    @Resource
    private CommonCodeRepository commonCodeRepository;

    @Override
    @Transactional
    public void deleteCmmnDetailCode(CmmnDetailCode cmmnDetailCode) throws Exception {
        commonCodeRepository.findById(new CommonCodeId(cmmnDetailCode.getCodeId(), cmmnDetailCode.getCode()))
                .ifPresent(entity -> entity.delete());
    }

    @Override
    @Transactional
    public void insertCmmnDetailCode(CmmnDetailCode cmmnDetailCode) throws Exception {
        CommonCode entity = CommonCode.builder()
                .codeGroupId(cmmnDetailCode.getCodeId())
                .code(cmmnDetailCode.getCode())
                .codeNm(cmmnDetailCode.getCodeNm())
                .codeDc(cmmnDetailCode.getCodeDc())
                .useAt(cmmnDetailCode.getUseAt())
                .frstRegisterId(cmmnDetailCode.getFrstRegisterId())
                .build();
        commonCodeRepository.save(entity);
    }

    @Override
    public CmmnDetailCode selectCmmnDetailCodeDetail(CmmnDetailCode cmmnDetailCode) throws Exception {
        return commonCodeRepository.findById(new CommonCodeId(cmmnDetailCode.getCodeId(), cmmnDetailCode.getCode()))
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<?> selectCmmnDetailCodeList(CmmnDetailCodeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                searchVO.getRecordCountPerPage());
        Page<CommonCode> result = commonCodeRepository.searchCommonCodes(searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public int selectCmmnDetailCodeListTotCnt(CmmnDetailCodeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<CommonCode> result = commonCodeRepository.searchCommonCodes(searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    @Override
    @Transactional
    public void updateCmmnDetailCode(CmmnDetailCode cmmnDetailCode) throws Exception {
        commonCodeRepository.findById(new CommonCodeId(cmmnDetailCode.getCodeId(), cmmnDetailCode.getCode()))
                .ifPresent(entity -> {
                    entity.update(cmmnDetailCode.getCodeNm(), cmmnDetailCode.getCodeDc(), cmmnDetailCode.getUseAt(),
                            cmmnDetailCode.getLastUpdusrId());
                });
    }

    private CmmnDetailCode convertToVo(CommonCode entity) {
        CmmnDetailCode vo = new CmmnDetailCode();
        vo.setCodeId(entity.getCodeGroupId());
        vo.setCode(entity.getCode());
        vo.setCodeNm(entity.getCodeNm());
        vo.setCodeDc(entity.getCodeDc());
        vo.setUseAt(entity.getUseAt());
        return vo;
    }
}
