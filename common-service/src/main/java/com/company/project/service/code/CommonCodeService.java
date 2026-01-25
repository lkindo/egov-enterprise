package com.company.project.service.code;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import com.company.project.domain.code.CommonCodeCategory;
import com.company.project.domain.code.CommonCodeCategoryRepository;
import com.company.project.domain.code.CommonCodeGroup;
import com.company.project.domain.code.CommonCodeGroupRepository;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service("egovCommonCodeService")
@RequiredArgsConstructor
public class CommonCodeService extends EgovAbstractServiceImpl implements EgovCommonCodeService {

    private final CommonCodeRepository commonCodeRepository;
    private final CommonCodeCategoryRepository commonCodeCategoryRepository;
    private final CommonCodeGroupRepository commonCodeGroupRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "commonCodes", key = "#codeGroupId")
    public List<CommonCodeDto> getCodesByGroup(String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseAt(codeGroupId, "Y").stream()
                .map(CommonCodeDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public CommonCodeDto createCode(CommonCodeSaveRequest request) {
        egovLogger.info("Creating common code: {}/{}", request.codeGroupId(), request.code());

        if (commonCodeRepository
                .findById(new com.company.project.domain.code.CommonCodeId(request.codeGroupId(), request.code()))
                .isPresent()) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }

        CommonCode code = CommonCode.builder()
                .codeGroupId(request.codeGroupId())
                .code(request.code())
                .codeNm(request.codeNm())
                .codeDc(request.codeDc())
                .useAt(request.useAt())
                .build();

        return CommonCodeDto.from(commonCodeRepository.save(code));
    }
    // --- 공통분류코드 (CmmnClCode) ---

    public List<CmmnClCodeDto> selectCmmnClCodeList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<CommonCodeCategory> page = commonCodeCategoryRepository.searchCommonCodeCategories(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    public int selectCmmnClCodeListTotCnt(ComDefaultVO searchVO) {
        // searchCommonCodeCategories returns Page, so we can use a small page search to
        // get total elements
        // or expose a count method. For efficiency, assume search returns total count
        // in Page object.
        // But since we need just count, we can do a lightweight search.
        Pageable pageable = PageRequest.of(0, 1);
        return (int) commonCodeCategoryRepository.searchCommonCodeCategories(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    public CmmnClCodeDto selectCmmnClCodeDetail(CmmnClCodeDto dto) {
        return commonCodeCategoryRepository.findById(dto.getClCode())
                .map(this::toDto)
                .orElse(null);
    }

    @Transactional
    public void insertCmmnClCode(CmmnClCodeDto dto) {
        if (commonCodeCategoryRepository.existsById(dto.getClCode())) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }
        CommonCodeCategory entity = CommonCodeCategory.builder()
                .clCode(dto.getClCode())
                .clCodeNm(dto.getClCodeNm())
                .clCodeDc(dto.getClCodeDc())
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        commonCodeCategoryRepository.save(entity);
    }

    @Transactional
    public void updateCmmnClCode(CmmnClCodeDto dto) {
        commonCodeCategoryRepository.findById(dto.getClCode()).ifPresent(entity -> {
            entity.update(dto.getClCodeNm(), dto.getClCodeDc(), dto.getUseAt(), dto.getLastUpdusrId());
        });
    }

    @Transactional
    public void deleteCmmnClCode(CmmnClCodeDto dto) {
        commonCodeCategoryRepository.findById(dto.getClCode()).ifPresent(CommonCodeCategory::delete);
    }

    private CmmnClCodeDto toDto(CommonCodeCategory entity) {
        return CmmnClCodeDto.builder()
                .clCode(entity.getClCode())
                .clCodeNm(entity.getClCodeNm())
                .clCodeDc(entity.getClCodeDc())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .lastUpdusrId(entity.getLastUpdusrId())
                .build();
    }

    // --- 공통코드(그룹) (CmmnCode) ---

    public List<CmmnCodeDto> selectCmmnCodeList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<com.company.project.domain.code.CommonCodeGroupProjection> page = commonCodeGroupRepository
                .searchCommonCodeGroups(
                        searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    public int selectCmmnCodeListTotCnt(ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) commonCodeGroupRepository.searchCommonCodeGroups(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    public CmmnCodeDto selectCmmnCodeDetail(CmmnCodeDto dto) {
        return commonCodeGroupRepository.findById(dto.getCodeId())
                .map(this::toDto)
                .orElse(null);
    }

    @Transactional
    public void insertCmmnCode(CmmnCodeDto dto) {
        if (commonCodeGroupRepository.existsById(dto.getCodeId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }
        CommonCodeGroup entity = CommonCodeGroup.builder()
                .codeId(dto.getCodeId())
                .codeIdNm(dto.getCodeIdNm())
                .codeIdDc(dto.getCodeIdDc())
                .clCode(dto.getClCode())
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        commonCodeGroupRepository.save(entity);
    }

    @Transactional
    public void updateCmmnCode(CmmnCodeDto dto) {
        commonCodeGroupRepository.findById(dto.getCodeId()).ifPresent(entity -> {
            entity.update(dto.getCodeIdNm(), dto.getCodeIdDc(), dto.getUseAt(), dto.getLastUpdusrId());
        });
    }

    @Transactional
    public void deleteCmmnCode(CmmnCodeDto dto) {
        commonCodeGroupRepository.findById(dto.getCodeId()).ifPresent(CommonCodeGroup::delete);
    }

    private CmmnCodeDto toDto(com.company.project.domain.code.CommonCodeGroupProjection projection) {
        return CmmnCodeDto.builder()
                .codeId(projection.getCodeId())
                .codeIdNm(projection.getCodeIdNm())
                .codeIdDc(projection.getCodeIdDc())
                .clCode(projection.getClCode())
                .clCodeNm(projection.getClCodeNm())
                .useAt(projection.getUseAt())
                .build();
    }

    private CmmnCodeDto toDto(CommonCodeGroup entity) {
        String clCodeNm = commonCodeCategoryRepository.findById(entity.getClCode())
                .map(CommonCodeCategory::getClCodeNm).orElse("");
        return CmmnCodeDto.builder()
                .codeId(entity.getCodeId())
                .codeIdNm(entity.getCodeIdNm())
                .codeIdDc(entity.getCodeIdDc())
                .clCode(entity.getClCode())
                .clCodeNm(clCodeNm)
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .lastUpdusrId(entity.getLastUpdusrId())
                .build();
    }

    // --- 공통상세코드 (CmmnDetailCode) ---

    public List<CmmnDetailCodeDto> selectCmmnDetailCodeList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<com.company.project.domain.code.CommonCodeDetailProjection> page = commonCodeRepository
                .searchCommonCodeDetails(
                        searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    public int selectCmmnDetailCodeListTotCnt(ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) commonCodeRepository.searchCommonCodeDetails(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    public CmmnDetailCodeDto selectCmmnDetailCodeDetail(CmmnDetailCodeDto dto) {
        return commonCodeRepository
                .findById(new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode()))
                .map(this::toDto)
                .orElse(null);
    }

    @Transactional
    public void insertCmmnDetailCode(CmmnDetailCodeDto dto) {
        if (commonCodeRepository
                .existsById(new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode()))) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }
        CommonCode entity = CommonCode.builder()
                .codeGroupId(dto.getCodeId())
                .code(dto.getCode())
                .codeNm(dto.getCodeNm())
                .codeDc(dto.getCodeDc())
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        commonCodeRepository.save(entity);
    }

    @Transactional
    public void updateCmmnDetailCode(CmmnDetailCodeDto dto) {
        commonCodeRepository.findById(new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode()))
                .ifPresent(entity -> {
                    entity.update(dto.getCodeNm(), dto.getCodeDc(), dto.getUseAt(), dto.getLastUpdusrId());
                });
    }

    @Transactional
    public void deleteCmmnDetailCode(CmmnDetailCodeDto dto) {
        commonCodeRepository.findById(new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode()))
                .ifPresent(CommonCode::delete);
    }

    private CmmnDetailCodeDto toDto(com.company.project.domain.code.CommonCodeDetailProjection projection) {
        return CmmnDetailCodeDto.builder()
                .codeId(projection.getCodeId())
                .codeIdNm(projection.getCodeIdNm())
                .code(projection.getCode())
                .codeNm(projection.getCodeNm())
                .codeDc(projection.getCodeDc())
                .useAt(projection.getUseAt())
                .build();
    }

    private CmmnDetailCodeDto toDto(CommonCode entity) {
        String codeGroupIdNm = commonCodeGroupRepository.findById(entity.getCodeGroupId())
                .map(CommonCodeGroup::getCodeIdNm).orElse("");

        return CmmnDetailCodeDto.builder()
                .codeId(entity.getCodeGroupId())
                .codeIdNm(codeGroupIdNm)
                .code(entity.getCode())
                .codeNm(entity.getCodeNm())
                .codeDc(entity.getCodeDc())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .lastUpdusrId(entity.getLastUpdusrId())
                .build();
    }
}
