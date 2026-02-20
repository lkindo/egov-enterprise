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
import java.util.Objects;
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
import org.springframework.lang.NonNull;

@Service("egovCommonCodeService")
@RequiredArgsConstructor
public class CommonCodeService extends EgovAbstractServiceImpl implements EgovCommonCodeService {

    private final CommonCodeRepository commonCodeRepository;
    private final CommonCodeCategoryRepository commonCodeCategoryRepository;
    private final CommonCodeGroupRepository commonCodeGroupRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "commonCodes", key = "#codeGroupId")
    public List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseAt(Objects.requireNonNull(codeGroupId), "Y")
                .stream()
                .map(CommonCodeDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request) {
        egovLogger.info("Creating common code: {}/{}", request.codeGroupId(), request.code());

        if (commonCodeRepository
                .findById(new com.company.project.domain.code.CommonCodeId(request.codeGroupId(), request.code()))
                .isPresent()) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }

        CommonCode code = CommonCode.builder()
                .codeGroupId(Objects.requireNonNull(request.codeGroupId()))
                .code(Objects.requireNonNull(request.code()))
                .codeNm(Objects.requireNonNull(request.codeNm()))
                .codeDc(request.codeDc())
                .useAt(request.useAt())
                .build();

        return CommonCodeDto.from(commonCodeRepository.save(Objects.requireNonNull(code)));
    }
    // --- 怨듯넻遺꾨쪟肄붾뱶 (CmmnClCode) ---

    @Override
    public List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<CommonCodeCategory> page = commonCodeCategoryRepository.searchCommonCodeCategories(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), Objects.requireNonNull(pageable));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public int selectCmmnClCodeListTotCnt(@NonNull ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) commonCodeCategoryRepository.searchCommonCodeCategories(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    @Override
    public CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto) {
        return commonCodeCategoryRepository.findById(Objects.requireNonNull(dto.getClCode()))
                .map(this::toDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void insertCmmnClCode(@NonNull CmmnClCodeDto dto) {
        if (commonCodeCategoryRepository.existsById(Objects.requireNonNull(dto.getClCode()))) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }
        CommonCodeCategory entity = CommonCodeCategory.builder()
                .clCode(Objects.requireNonNull(dto.getClCode()))
                .clCodeNm(Objects.requireNonNull(dto.getClCodeNm()))
                .clCodeDc(dto.getClCodeDc())
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        commonCodeCategoryRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateCmmnClCode(@NonNull CmmnClCodeDto dto) {
        commonCodeCategoryRepository.findById(Objects.requireNonNull(dto.getClCode())).ifPresent(entity -> {
            entity.update(Objects.requireNonNull(dto.getClCodeNm()), dto.getClCodeDc(), dto.getUseAt(),
                    dto.getLastUpdusrId());
        });
    }

    @Override
    @Transactional
    public void deleteCmmnClCode(@NonNull CmmnClCodeDto dto) {
        commonCodeCategoryRepository.findById(Objects.requireNonNull(dto.getClCode()))
                .ifPresent(CommonCodeCategory::delete);
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

    // --- 怨듯넻肄붾뱶(洹몃９) (CmmnCode) ---

    @Override
    public List<CmmnCodeDto> selectCmmnCodeList(@NonNull ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<com.company.project.domain.code.CommonCodeGroupProjection> page = commonCodeGroupRepository
                .searchCommonCodeGroups(
                        searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                        Objects.requireNonNull(pageable));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public int selectCmmnCodeListTotCnt(@NonNull ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) commonCodeGroupRepository.searchCommonCodeGroups(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    @Override
    public CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto) {
        return commonCodeGroupRepository.findById(Objects.requireNonNull(dto.getCodeId()))
                .map(this::toDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void insertCmmnCode(@NonNull CmmnCodeDto dto) {
        if (commonCodeGroupRepository.existsById(Objects.requireNonNull(dto.getCodeId()))) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }
        CommonCodeGroup entity = CommonCodeGroup.builder()
                .codeId(Objects.requireNonNull(dto.getCodeId()))
                .codeIdNm(Objects.requireNonNull(dto.getCodeIdNm()))
                .codeIdDc(dto.getCodeIdDc())
                .clCode(Objects.requireNonNull(dto.getClCode()))
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        commonCodeGroupRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateCmmnCode(@NonNull CmmnCodeDto dto) {
        commonCodeGroupRepository.findById(Objects.requireNonNull(dto.getCodeId())).ifPresent(entity -> {
            entity.update(Objects.requireNonNull(dto.getCodeIdNm()), dto.getCodeIdDc(), dto.getUseAt(),
                    dto.getLastUpdusrId());
        });
    }

    @Override
    @Transactional
    public void deleteCmmnCode(@NonNull CmmnCodeDto dto) {
        commonCodeGroupRepository.findById(Objects.requireNonNull(dto.getCodeId()))
                .ifPresent(CommonCodeGroup::delete);
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
        String clCodeNm = commonCodeCategoryRepository.findById(Objects.requireNonNull(entity.getClCode()))
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

    // --- 怨듯넻?곸꽭肄붾뱶 (CmmnDetailCode) ---

    @Override
    public List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<com.company.project.domain.code.CommonCodeDetailProjection> page = commonCodeRepository
                .searchCommonCodeDetails(
                        searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                        Objects.requireNonNull(pageable));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public int selectCmmnDetailCodeListTotCnt(@NonNull ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) commonCodeRepository.searchCommonCodeDetails(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable).getTotalElements();
    }

    @Override
    public CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto) {
        return commonCodeRepository
                .findById(Objects.requireNonNull(
                        new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode())))
                .map(this::toDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {
        if (commonCodeRepository
                .existsById(Objects.requireNonNull(
                        new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode())))) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }
        CommonCode entity = CommonCode.builder()
                .codeGroupId(Objects.requireNonNull(dto.getCodeId()))
                .code(Objects.requireNonNull(dto.getCode()))
                .codeNm(Objects.requireNonNull(dto.getCodeNm()))
                .codeDc(dto.getCodeDc())
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        commonCodeRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {
        commonCodeRepository
                .findById(Objects.requireNonNull(
                        new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode())))
                .ifPresent(entity -> {
                    entity.update(Objects.requireNonNull(dto.getCodeNm()), dto.getCodeDc(), dto.getUseAt(),
                            dto.getLastUpdusrId());
                });
    }

    @Override
    @Transactional
    public void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {
        commonCodeRepository
                .findById(Objects.requireNonNull(
                        new com.company.project.domain.code.CommonCodeId(dto.getCodeId(), dto.getCode())))
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
