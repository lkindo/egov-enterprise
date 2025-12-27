package egovframework.let.sym.ccm.ccc.service.impl;

import com.company.project.domain.code.CommonCodeCategory;
import com.company.project.domain.code.CommonCodeCategoryRepository;
import egovframework.let.sym.ccm.ccc.service.CmmnClCode;
import egovframework.let.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.let.sym.ccm.ccc.service.EgovCcmCmmnClCodeManageService;
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
 * 공통분류코드에 대한 서비스 구현클래스 (JPA 전환)
 */
@Service("CmmnClCodeManageService")
@Transactional(readOnly = true)
public class EgovCcmCmmnClCodeManageServiceImpl extends EgovAbstractServiceImpl
        implements EgovCcmCmmnClCodeManageService {

    @Resource
    private CommonCodeCategoryRepository commonCodeCategoryRepository;

    @Override
    @Transactional
    public void deleteCmmnClCode(CmmnClCode cmmnClCode) throws Exception {
        commonCodeCategoryRepository.findById(cmmnClCode.getClCode())
                .ifPresent(entity -> entity.delete());
    }

    @Override
    @Transactional
    public void insertCmmnClCode(CmmnClCode cmmnClCode) throws Exception {
        CommonCodeCategory entity = CommonCodeCategory.builder()
                .clCode(cmmnClCode.getClCode())
                .clCodeNm(cmmnClCode.getClCodeNm())
                .clCodeDc(cmmnClCode.getClCodeDc())
                .useAt(cmmnClCode.getUseAt())
                .frstRegisterId(cmmnClCode.getFrstRegisterId())
                .build();
        commonCodeCategoryRepository.save(entity);
    }

    @Override
    public CmmnClCode selectCmmnClCodeDetail(CmmnClCode cmmnClCode) throws Exception {
        return commonCodeCategoryRepository.findById(cmmnClCode.getClCode())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<?> selectCmmnClCodeList(CmmnClCodeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
                searchVO.getRecordCountPerPage());
        Page<CommonCodeCategory> result = commonCodeCategoryRepository
                .searchCommonCodeCategories(searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public int selectCmmnClCodeListTotCnt(CmmnClCodeVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<CommonCodeCategory> result = commonCodeCategoryRepository
                .searchCommonCodeCategories(searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    @Override
    @Transactional
    public void updateCmmnClCode(CmmnClCode cmmnClCode) throws Exception {
        commonCodeCategoryRepository.findById(cmmnClCode.getClCode())
                .ifPresent(entity -> {
                    entity.update(cmmnClCode.getClCodeNm(), cmmnClCode.getClCodeDc(), cmmnClCode.getUseAt(),
                            cmmnClCode.getLastUpdusrId());
                });
    }

    private CmmnClCode convertToVo(CommonCodeCategory entity) {
        CmmnClCode vo = new CmmnClCode();
        vo.setClCode(entity.getClCode());
        vo.setClCodeNm(entity.getClCodeNm());
        vo.setClCodeDc(entity.getClCodeDc());
        vo.setUseAt(entity.getUseAt());
        return vo;
    }
}
