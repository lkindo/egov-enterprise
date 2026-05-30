package nuri.business.service.code;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeRepository;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.code.dto.CommonCodeSaveRequest;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.business.domain.code.CommonCodeCategory;
import nuri.business.domain.code.CommonCodeCategoryRepository;
import nuri.business.domain.code.CommonCodeGroup;
import nuri.business.domain.code.CommonCodeGroupRepository;
import nuri.business.service.code.dto.CmmnClCodeDto;
import nuri.business.service.code.dto.CmmnCodeDto;
import nuri.business.service.code.dto.CmmnDetailCodeDto;
import nuri.business.domain.common.BaseSearchDto;
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
                                .findByCdIdAndUseYn(required(codeGroupId, "codeGroupId 는 null 일 수 없습니다"), "Y")
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
                                .findById(new nuri.business.domain.code.CommonCodeId(
                                                request.codeGroupId(),
                                                request.code()))
                                .isPresent()) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }

                CommonCode code = CommonCode.builder()
                                .cdId(required(request.codeGroupId(), "request.codeGroupId() 는 null 일 수 없습니다"))
                                .dtlCd(required(request.code(), "request.code() 는 null 일 수 없습니다"))
                                .dtlCdNm(required(request.codeNm(), "request.codeNm() 는 null 일 수 없습니다"))
                                .dtlCdExpln(request.codeDc())
                                .useYn(request.useYn())
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
                                .findById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElse(null);
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnClCode(@NonNull CmmnClCodeDto dto) {

                if (commonCodeCategoryRepository
                                .existsById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }
                CommonCodeCategory entity = CommonCodeCategory.builder()
                                .clsfCd(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .clsfCdNm(required(dto.getClsfCdNm(), "dto.getClsfCdNm() 는 null 일 수 없습니다"))
                                .clsfCdExpln(dto.getClsfCdExpln())
                                .useYn(dto.getUseYn())
                                .createdBy(dto.getFrstRegisterId())
                                .build();
                commonCodeCategoryRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnClCode(@NonNull CmmnClCodeDto dto) {

                commonCodeCategoryRepository.findById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        entity.update(required(dto.getClsfCdNm(), "dto.getClsfCdNm() 는 null 일 수 없습니다"),
                                                        dto.getClsfCdExpln(),
                                                        dto.getUseYn(),
                                                        dto.getLastUpdusrId());
                                });
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnClCode(@NonNull CmmnClCodeDto dto) {

                commonCodeCategoryRepository.findById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .ifPresent(CommonCodeCategory::delete);
        }

        private CmmnClCodeDto toDto(CommonCodeCategory entity) {
                return CmmnClCodeDto.builder()
                                .clsfCd(entity.getClsfCd())
                                .clsfCdNm(entity.getClsfCdNm())
                                .clsfCdExpln(entity.getClsfCdExpln())
                                .useYn(entity.getUseYn())
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
                Page<nuri.business.domain.code.CommonCodeGroupProjection> page = commonCodeGroupRepository
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
                return commonCodeGroupRepository.findById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElse(null);
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnCode(@NonNull CmmnCodeDto dto) {

                if (commonCodeGroupRepository
                                .existsById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }
                CommonCodeGroup entity = CommonCodeGroup.builder()
                                .cdId(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .cdIdNm(required(dto.getCdIdNm(), "dto.getCdIdNm() 는 null 일 수 없습니다"))
                                .cdIdExpln(dto.getCdIdExpln())
                                .clsfCd(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .useYn(dto.getUseYn())
                                .createdBy(dto.getFrstRegisterId())
                                .build();
                commonCodeGroupRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnCode(@NonNull CmmnCodeDto dto) {

                commonCodeGroupRepository.findById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        entity.update(required(dto.getCdIdNm(), "dto.getCdIdNm() 는 null 일 수 없습니다"),
                                                        dto.getCdIdExpln(),
                                                        dto.getUseYn(),
                                                        dto.getLastUpdusrId());
                                });
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnCode(@NonNull CmmnCodeDto dto) {

                commonCodeGroupRepository.findById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .ifPresent(CommonCodeGroup::delete);
        }

        private CmmnCodeDto toDto(nuri.business.domain.code.CommonCodeGroupProjection projection) {
                return CmmnCodeDto.builder()
                                .cdId(projection.getCdId())
                                .cdIdNm(projection.getCdIdNm())
                                .cdIdExpln(projection.getCdIdExpln())
                                .clsfCd(projection.getClsfCd())
                                .clsfCdNm(projection.getClsfCdNm())
                                .useYn(projection.getUseYn())
                                .build();
        }

        private CmmnCodeDto toDto(CommonCodeGroup entity) {
                String clCodeNm = commonCodeCategoryRepository
                                .findById(required(entity.getClsfCd(), "entity.getClsfCd() 는 null 일 수 없습니다"))
                                .map(CommonCodeCategory::getClsfCdNm).orElse("");
                return CmmnCodeDto.builder()
                                .cdId(entity.getCdId())
                                .cdIdNm(entity.getCdIdNm())
                                .cdIdExpln(entity.getCdIdExpln())
                                .clsfCd(entity.getClsfCd())
                                .clsfCdNm(clCodeNm)
                                .useYn(entity.getUseYn())
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
                Page<nuri.business.domain.code.CommonCodeDetailProjection> page = commonCodeRepository
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
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
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
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
                                                "CommonCodeId 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_CODE);
                }
                CommonCode entity = CommonCode.builder()
                                .cdId(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .dtlCd(required(dto.getDtlCd(), "dto.getDtlCd() 는 null 일 수 없습니다"))
                                .dtlCdNm(required(dto.getDtlCdNm(), "dto.getDtlCdNm() 는 null 일 수 없습니다"))
                                .dtlCdExpln(dto.getDtlCdExpln())
                                .useYn(dto.getUseYn())
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
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        entity.update(required(dto.getDtlCdNm(), "dto.getDtlCdNm() 는 null 일 수 없습니다"),
                                                        dto.getDtlCdExpln(),
                                                        dto.getUseYn(),
                                                        dto.getLastUpdusrId());
                                });
        }

        @Override
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {

                commonCodeRepository
                                .findById(required(
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .ifPresent(CommonCode::delete);
        }

        private CmmnDetailCodeDto toDto(
                        nuri.business.domain.code.CommonCodeDetailProjection projection) {
                return CmmnDetailCodeDto.builder()
                                .cdId(projection.getCdId())
                                .cdIdNm(projection.getCdIdNm())
                                .dtlCd(projection.getDtlCd())
                                .dtlCdNm(projection.getDtlCdNm())
                                .dtlCdExpln(projection.getDtlCdExpln())
                                .useYn(projection.getUseYn())
                                .build();
        }

        private CmmnDetailCodeDto toDto(CommonCode entity) {
                String codeGroupIdNm = commonCodeGroupRepository.findById(entity.getCdId())
                                .map(CommonCodeGroup::getCdIdNm).orElse("");
 
                return CmmnDetailCodeDto.builder()
                                .cdId(entity.getCdId())
                                .cdIdNm(codeGroupIdNm)
                                .dtlCd(entity.getDtlCd())
                                .dtlCdNm(entity.getDtlCdNm())
                                .dtlCdExpln(entity.getDtlCdExpln())
                                .useYn(entity.getUseYn())
                                .frstRegisterId(entity.getFrstRegisterId())
                                .lastUpdusrId(entity.getLastUpdusrId())
                                .build();
        }
}
