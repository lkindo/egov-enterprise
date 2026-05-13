package nuri.foundation.service.code;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import nuri.foundation.domain.code.CommonCode;
import nuri.foundation.domain.code.CommonCodeRepository;
import nuri.foundation.service.code.dto.CommonCodeDto;
import nuri.foundation.service.code.dto.CommonCodeSaveRequest;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.foundation.domain.code.CommonCodeCategory;
import nuri.foundation.domain.code.CommonCodeCategoryRepository;
import nuri.foundation.domain.code.CommonCodeGroup;
import nuri.foundation.domain.code.CommonCodeGroupRepository;
import nuri.foundation.service.code.dto.CmmnClCodeDto;
import nuri.foundation.service.code.dto.CmmnCodeDto;
import nuri.foundation.service.code.dto.CmmnDetailCodeDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

@Service("egovCommonCodeService")
public class CommonCodeService extends BaseAbstractService implements EgovCommonCodeService {

        private final CommonCodeRepository commonCodeRepository;
        private final CommonCodeCategoryRepository commonCodeCategoryRepository;
        private final CommonCodeGroupRepository commonCodeGroupRepository;

        public CommonCodeService(CommonCodeRepository commonCodeRepository,
                        CommonCodeCategoryRepository commonCodeCategoryRepository,
                        CommonCodeGroupRepository commonCodeGroupRepository) {
                this.commonCodeRepository = required(commonCodeRepository, "CommonCodeRepository 는 null 일 수 없습니다");
                this.commonCodeCategoryRepository = required(commonCodeCategoryRepository,
                                "CommonCodeCategoryRepository 는 null 일 수 없습니다");
                this.commonCodeGroupRepository = required(commonCodeGroupRepository,
                                "CommonCodeGroupRepository 는 null 일 수 없습니다");
        }

        @Override
        @Transactional(readOnly = true)
        @Cacheable(value = "commonCodes", key = "#codeGroupId")
        public List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId) {
                return commonCodeRepository
                                .findByCodeGroupIdAndUseAt(required(codeGroupId, "codeGroupId 는 null 일 수 없습니다"), "Y")
                                .stream()
                                .map(CommonCodeDto::from)
                                .collect(Collectors.toList());
        }

        @Override
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request) {

                egovLogger.info("Creating common code: {}/{}", request.codeGroupId(), request.code());

                if (commonCodeRepository
                                .findById(new nuri.foundation.domain.code.CommonCodeId(
                                                request.codeGroupId(),
                                                request.code()))
                                .isPresent()) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }

                CommonCode code = CommonCode.builder()
                                .codeGroupId(required(request.codeGroupId(), "request.codeGroupId() 는 null 일 수 없습니다"))
                                .code(required(request.code(), "request.code() 는 null 일 수 없습니다"))
                                .codeNm(required(request.codeNm(), "request.codeNm() 는 null 일 수 없습니다"))
                                .codeDc(request.codeDc())
                                .useAt(request.useAt())
                                .build();

                return CommonCodeDto.from(commonCodeRepository.save(required(code, "code 는 null 일 수 없습니다")));
        }
        // --- 공통분류코드 (CmmnClCode) ---

        @Override
        public List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull BaseSearchDto searchVO) {
                int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
                int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
                Pageable pageable = PageRequest.of(pageIndex, pageUnit);
                Page<CommonCodeCategory> page = commonCodeCategoryRepository.searchCommonCodeCategories(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                                required(pageable, "pageable 는 null 일 수 없습니다"));
                return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        }

        @Override
        public int selectCmmnClCodeListTotCnt(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) commonCodeCategoryRepository.searchCommonCodeCategories(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        @Override
        public CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto) {
                return commonCodeCategoryRepository
                                .findById(required(dto.getClCode(), "dto.getClCode() 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElse(null);
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnClCode(@NonNull CmmnClCodeDto dto) {

                if (commonCodeCategoryRepository
                                .existsById(required(dto.getClCode(), "dto.getClCode() 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }
                CommonCodeCategory entity = CommonCodeCategory.builder()
                                .clCode(required(dto.getClCode(), "dto.getClCode() 는 null 일 수 없습니다"))
                                .clCodeNm(required(dto.getClCodeNm(), "dto.getClCodeNm() 는 null 일 수 없습니다"))
                                .clCodeDc(dto.getClCodeDc())
                                .useAt(dto.getUseAt())
                                .createdBy(dto.getFrstRegisterId())
                                .build();
                commonCodeCategoryRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnClCode(@NonNull CmmnClCodeDto dto) {

                commonCodeCategoryRepository.findById(required(dto.getClCode(), "dto.getClCode() 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        entity.update(required(dto.getClCodeNm(), "dto.getClCodeNm() 는 null 일 수 없습니다"),
                                                        dto.getClCodeDc(),
                                                        dto.getUseAt(),
                                                        dto.getLastUpdusrId());
                                });
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnClCode(@NonNull CmmnClCodeDto dto) {

                commonCodeCategoryRepository.findById(required(dto.getClCode(), "dto.getClCode() 는 null 일 수 없습니다"))
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

        // --- 공통코드 (CmmnCode) ---

        @Override
        public List<CmmnCodeDto> selectCmmnCodeList(@NonNull BaseSearchDto searchVO) {
                int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
                int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
                Pageable pageable = PageRequest.of(pageIndex, pageUnit);
                Page<nuri.foundation.domain.code.CommonCodeGroupProjection> page = commonCodeGroupRepository
                                .searchCommonCodeGroups(
                                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                                                required(pageable, "pageable 는 null 일 수 없습니다"));
                return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        }

        @Override
        public int selectCmmnCodeListTotCnt(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) commonCodeGroupRepository.searchCommonCodeGroups(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        @Override
        public CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto) {
                return commonCodeGroupRepository.findById(required(dto.getCodeId(), "dto.getCodeId() 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElse(null);
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnCode(@NonNull CmmnCodeDto dto) {

                if (commonCodeGroupRepository
                                .existsById(required(dto.getCodeId(), "dto.getCodeId() 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }
                CommonCodeGroup entity = CommonCodeGroup.builder()
                                .codeId(required(dto.getCodeId(), "dto.getCodeId() 는 null 일 수 없습니다"))
                                .codeIdNm(required(dto.getCodeIdNm(), "dto.getCodeIdNm() 는 null 일 수 없습니다"))
                                .codeIdDc(dto.getCodeIdDc())
                                .clCode(required(dto.getClCode(), "dto.getClCode() 는 null 일 수 없습니다"))
                                .useAt(dto.getUseAt())
                                .createdBy(dto.getFrstRegisterId())
                                .build();
                commonCodeGroupRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnCode(@NonNull CmmnCodeDto dto) {

                commonCodeGroupRepository.findById(required(dto.getCodeId(), "dto.getCodeId() 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        entity.update(required(dto.getCodeIdNm(), "dto.getCodeIdNm() 는 null 일 수 없습니다"),
                                                        dto.getCodeIdDc(),
                                                        dto.getUseAt(),
                                                        dto.getLastUpdusrId());
                                });
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnCode(@NonNull CmmnCodeDto dto) {

                commonCodeGroupRepository.findById(required(dto.getCodeId(), "dto.getCodeId() 는 null 일 수 없습니다"))
                                .ifPresent(CommonCodeGroup::delete);
        }

        private CmmnCodeDto toDto(nuri.foundation.domain.code.CommonCodeGroupProjection projection) {
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
                String clCodeNm = commonCodeCategoryRepository
                                .findById(required(entity.getClCode(), "entity.getClCode() 는 null 일 수 없습니다"))
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

        @Override
        public List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull BaseSearchDto searchVO) {
                int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
                int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
                Pageable pageable = PageRequest.of(pageIndex, pageUnit);
                Page<nuri.foundation.domain.code.CommonCodeDetailProjection> page = commonCodeRepository
                                .searchCommonCodeDetails(
                                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                                                required(pageable, "pageable 는 null 일 수 없습니다"));
                return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        }

        @Override
        public int selectCmmnDetailCodeListTotCnt(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) commonCodeRepository.searchCommonCodeDetails(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        @Override
        public CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto) {
                return commonCodeRepository
                                .findById(required(
                                                new nuri.foundation.domain.code.CommonCodeId(
                                                                dto.getCodeId(), dto.getCode()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElse(null);
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {

                if (commonCodeRepository
                                .existsById(required(
                                                new nuri.foundation.domain.code.CommonCodeId(
                                                                dto.getCodeId(), dto.getCode()),
                                                "CommonCodeId 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }
                CommonCode entity = CommonCode.builder()
                                .codeGroupId(required(dto.getCodeId(), "dto.getCodeId() 는 null 일 수 없습니다"))
                                .code(required(dto.getCode(), "dto.getCode() 는 null 일 수 없습니다"))
                                .codeNm(required(dto.getCodeNm(), "dto.getCodeNm() 는 null 일 수 없습니다"))
                                .codeDc(dto.getCodeDc())
                                .useAt(dto.getUseAt())
                                .createdBy(dto.getFrstRegisterId())
                                .build();
                commonCodeRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {

                commonCodeRepository
                                .findById(required(
                                                new nuri.foundation.domain.code.CommonCodeId(
                                                                dto.getCodeId(), dto.getCode()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        entity.update(required(dto.getCodeNm(), "dto.getCodeNm() 는 null 일 수 없습니다"),
                                                        dto.getCodeDc(),
                                                        dto.getUseAt(),
                                                        dto.getLastUpdusrId());
                                });
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {

                commonCodeRepository
                                .findById(required(
                                                new nuri.foundation.domain.code.CommonCodeId(
                                                                dto.getCodeId(), dto.getCode()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .ifPresent(CommonCode::delete);
        }

        private CmmnDetailCodeDto toDto(
                        nuri.foundation.domain.code.CommonCodeDetailProjection projection) {
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
