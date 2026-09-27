package nuri.business.service.code;
import nuri.business.domain.code.exception.CodeErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeRepository;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.code.dto.CommonCodeMapper;
import nuri.business.service.code.dto.CommonCodeSaveRequest;
import nuri.business.security.util.SecurityUtil;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import nuri.foundation.security.annotation.AdminOnly;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.business.domain.code.CommonCodeCategory;
import nuri.business.domain.code.CommonCodeChange;
import nuri.business.domain.code.CommonCodeChangeRepository;
import nuri.business.domain.code.CommonCodeCategoryRepository;
import nuri.business.domain.code.CommonCodeGroup;
import nuri.business.domain.code.CommonCodeGroupRepository;
import nuri.business.service.code.dto.CmmnClCodeDto;
import nuri.business.service.code.dto.CmmnCodeDto;
import nuri.business.service.code.dto.CmmnCodeHierarchyDto;
import nuri.business.service.code.dto.CmmnDetailCodeDto;
import nuri.business.domain.common.BaseSearchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;

@Service
@Slf4j
@Transactional(readOnly = true)
public class CommonCodeService extends BaseAbstractService {

        private final CommonCodeRepository commonCodeRepository;
        private final CommonCodeCategoryRepository commonCodeCategoryRepository;
        private final CommonCodeGroupRepository commonCodeGroupRepository;
        private final CommonCodeMapper commonCodeMapper;
        private final CommonCodeChangeRepository changeRepository;

        public CommonCodeService(CommonCodeRepository commonCodeRepository,
                        CommonCodeCategoryRepository commonCodeCategoryRepository,
                        CommonCodeGroupRepository commonCodeGroupRepository,
                        CommonCodeMapper commonCodeMapper,
                        CommonCodeChangeRepository changeRepository) {
                this.commonCodeRepository = required(commonCodeRepository, "CommonCodeRepository 는 null 일 수 없습니다");
                this.commonCodeCategoryRepository = required(commonCodeCategoryRepository,
                                "CommonCodeCategoryRepository 는 null 일 수 없습니다");
                this.commonCodeGroupRepository = required(commonCodeGroupRepository,
                                "CommonCodeGroupRepository 는 null 일 수 없습니다");
                this.commonCodeMapper = required(commonCodeMapper, "CommonCodeMapper 는 null 일 수 없습니다");
                this.changeRepository = required(changeRepository, "CommonCodeChangeRepository 는 null 일 수 없습니다");
        }

        // --- 변경 이력(2026-09-27 DIP B5 F11) ---
        // 종전에는 코드 행에 최종 수정자·일시만 덮어써져, 누가 언제 명칭을 바꾸거나 쓰지 않게 했는지 남는 곳이 없었다.
        // 변경과 같은 트랜잭션에서 한 건씩 남긴다 — 변경이 롤백되면 이력도 남지 않는다. 바뀐 값이 없으면 남기지 않는다.

        private static final int CHANGE_TEXT_MAX = 4000;

        private static String codeSummary(String name, String explanation, String useYn) {
                return "명칭: " + (name == null ? "" : name)
                                + " / 설명: " + (explanation == null ? "" : explanation)
                                + " / 사용: " + (useYn == null ? "" : useYn);
        }

        private static String changedItems(String beforeName, String beforeExpln, String beforeUse,
                        String afterName, String afterExpln, String afterUse) {
                List<String> items = new java.util.ArrayList<>();
                if (!java.util.Objects.equals(beforeName, afterName)) items.add("명칭");
                if (!java.util.Objects.equals(beforeExpln, afterExpln)) items.add("설명");
                if (!java.util.Objects.equals(beforeUse, afterUse)) items.add("사용 여부");
                return String.join("·", items);
        }

        private static String clip(String value) {
                return value == null || value.length() <= CHANGE_TEXT_MAX ? value : value.substring(0, CHANGE_TEXT_MAX);
        }

        private void recordChange(String target, String type, String clsfCd, String cdId, String dtlCd,
                        String item, String before, String after) {
                changeRepository.save(CommonCodeChange.builder()
                                .chgTrgtTypeCd(target)
                                .chgTypeCd(type)
                                .clsfCd(clsfCd)
                                .cdId(cdId)
                                .dtlCd(dtlCd)
                                .chgArtclNm(item)
                                .chgBfrCn(clip(before))
                                .chgAftrCn(clip(after))
                                .chgUserIdntfr(SecurityUtil.getCurrentEsntlId().orElse(null))
                                .frstRgtrId(SecurityUtil.getCurrentLoginId().orElse("SYSTEM"))
                                .crtDt(java.time.LocalDateTime.now())
                                .build());
        }

        @Transactional(readOnly = true)
        @Cacheable(value = "commonCodes", key = "#codeGroupId")
        public List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId) {
                return commonCodeRepository
                                .findByCdIdAndUseYn(required(codeGroupId, "codeGroupId 는 null 일 수 없습니다"), "Y")
                                .stream()
                                .map(commonCodeMapper::toDto)
                                .collect(Collectors.toList());
        }

        @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('CODE_CREATE')")
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request) {

                log.info("Creating common code: {}/{}", request.cdId(), request.dtlCd());

                if (commonCodeRepository
                                .findById(new nuri.business.domain.code.CommonCodeId(
                                                request.cdId(),
                                                request.dtlCd()))
                                .isPresent()) {
                        throw new BusinessException(CodeErrorCode.DUPLICATE_CODE);
                }

                CommonCode code = CommonCode.builder()
                                .cdId(required(request.cdId(), "request.cdId() 는 null 일 수 없습니다"))
                                .dtlCd(required(request.dtlCd(), "request.dtlCd() 는 null 일 수 없습니다"))
                                .dtlCdNm(required(request.dtlCdNm(), "request.dtlCdNm() 는 null 일 수 없습니다"))
                                .dtlCdExpln(request.dtlCdExpln())
                                .useYn(request.useYn())
                                .build();

                CommonCode saved = commonCodeRepository.save(required(code, "code 는 null 일 수 없습니다"));
                recordChange("DTL", "ADD", null, saved.getCdId(), saved.getDtlCd(), "상세 코드 등록", null,
                                codeSummary(saved.getDtlCdNm(), saved.getDtlCdExpln(), saved.getUseYn()));
                return commonCodeMapper.toDto(saved);
        }
        // --- 공통분류코드 (CmmnClCode) ---

        public List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = searchVO.toPageable();
                Page<CommonCodeCategory> page = commonCodeCategoryRepository.searchCommonCodeCategories(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                                required(pageable, "pageable 는 null 일 수 없습니다"));
                return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        }

        public int selectCmmnClCodeListTotCnt(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) commonCodeCategoryRepository.searchCommonCodeCategories(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        public CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto) {
                return commonCodeCategoryRepository
                                .findById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElseThrow(() -> new BusinessException(
                                                CodeErrorCode.CODE_NOT_FOUND,
                                                "공통분류코드를 찾을 수 없습니다: " + dto.getClsfCd()));
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnClCode(@NonNull CmmnClCodeDto dto) {
                SecurityUtil.assertPermission("CODE_CREATE");

                if (commonCodeCategoryRepository
                                .existsById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))) {
                        throw new BusinessException(CodeErrorCode.DUPLICATE_CODE);
                }
                CommonCodeCategory entity = CommonCodeCategory.builder()
                                .clsfCd(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .clsfCdNm(required(dto.getClsfCdNm(), "dto.getClsfCdNm() 는 null 일 수 없습니다"))
                                .clsfCdExpln(dto.getClsfCdExpln())
                                .useYn(dto.getUseYn())
                                .build();
                commonCodeCategoryRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
                recordChange("CLSF", "ADD", entity.getClsfCd(), null, null, "분류 등록", null,
                                codeSummary(entity.getClsfCdNm(), entity.getClsfCdExpln(), entity.getUseYn()));
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnClCode(@NonNull CmmnClCodeDto dto) {
                SecurityUtil.assertPermission("CODE_UPDATE");

                commonCodeCategoryRepository.findById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        String bfrNm = entity.getClsfCdNm(), bfrExpln = entity.getClsfCdExpln(), bfrUse = entity.getUseYn();
                                        entity.update(required(dto.getClsfCdNm(), "dto.getClsfCdNm() 는 null 일 수 없습니다"),
                                                        dto.getClsfCdExpln(),
                                                        dto.getUseYn(),
                                                        dto.getLastMdfrId());
                                        String items = changedItems(bfrNm, bfrExpln, bfrUse,
                                                        entity.getClsfCdNm(), entity.getClsfCdExpln(), entity.getUseYn());
                                        if (!items.isEmpty()) {
                                                recordChange("CLSF", "UPDATE", entity.getClsfCd(), null, null, items,
                                                                codeSummary(bfrNm, bfrExpln, bfrUse),
                                                                codeSummary(entity.getClsfCdNm(), entity.getClsfCdExpln(), entity.getUseYn()));
                                        }
                                });
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnClCode(@NonNull CmmnClCodeDto dto) {
                SecurityUtil.assertPermission("CODE_DELETE");

                commonCodeCategoryRepository.findById(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .ifPresent(category -> {
                                        String bfrUse = category.getUseYn();
                                        category.delete();
                                        if (!java.util.Objects.equals(bfrUse, category.getUseYn())) recordChange("CLSF", "REMOVE", category.getClsfCd(), null, null, "분류 삭제(사용 안 함)",
                                                        "사용: " + bfrUse, "사용: " + category.getUseYn());
                                });
        }

        private CmmnClCodeDto toDto(CommonCodeCategory entity) {
                return CmmnClCodeDto.builder()
                                .clsfCd(entity.getClsfCd())
                                .clsfCdNm(entity.getClsfCdNm())
                                .clsfCdExpln(entity.getClsfCdExpln())
                                .useYn(entity.getUseYn())
                                .frstRgtrId(entity.getFrstRgtrId())
                                .lastMdfrId(entity.getLastMdfrId())
                                .build();
        }

        // --- 공통코드 (CmmnCode) ---

        public List<CmmnCodeDto> selectCmmnCodeList(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = searchVO.toPageable();
                Page<nuri.business.domain.code.CommonCodeGroupProjection> page = commonCodeGroupRepository
                                .searchCommonCodeGroups(
                                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                                                required(pageable, "pageable 는 null 일 수 없습니다"));
                return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        }

        public int selectCmmnCodeListTotCnt(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) commonCodeGroupRepository.searchCommonCodeGroups(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        public CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto) {
                return commonCodeGroupRepository.findById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElseThrow(() -> new BusinessException(
                                                CodeErrorCode.CODE_NOT_FOUND,
                                                "공통코드를 찾을 수 없습니다: " + dto.getCdId()));
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnCode(@NonNull CmmnCodeDto dto) {
                SecurityUtil.assertPermission("CODE_CREATE");

                if (commonCodeGroupRepository
                                .existsById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))) {
                        throw new BusinessException(CodeErrorCode.DUPLICATE_CODE);
                }
                CommonCodeGroup entity = CommonCodeGroup.builder()
                                .cdId(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .cdIdNm(required(dto.getCdIdNm(), "dto.getCdIdNm() 는 null 일 수 없습니다"))
                                .cdIdExpln(dto.getCdIdExpln())
                                .clsfCd(required(dto.getClsfCd(), "dto.getClsfCd() 는 null 일 수 없습니다"))
                                .useYn(dto.getUseYn())
                                .build();
                commonCodeGroupRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
                recordChange("CODE", "ADD", entity.getClsfCd(), entity.getCdId(), null, "그룹 등록", null,
                                codeSummary(entity.getCdIdNm(), entity.getCdIdExpln(), entity.getUseYn()));
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnCode(@NonNull CmmnCodeDto dto) {
                SecurityUtil.assertPermission("CODE_UPDATE");

                commonCodeGroupRepository.findById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        String bfrNm = entity.getCdIdNm(), bfrExpln = entity.getCdIdExpln(), bfrUse = entity.getUseYn();
                                        entity.update(required(dto.getCdIdNm(), "dto.getCdIdNm() 는 null 일 수 없습니다"),
                                                        dto.getCdIdExpln(),
                                                        dto.getUseYn(),
                                                        dto.getLastMdfrId());
                                        String items = changedItems(bfrNm, bfrExpln, bfrUse,
                                                        entity.getCdIdNm(), entity.getCdIdExpln(), entity.getUseYn());
                                        if (!items.isEmpty()) {
                                                recordChange("CODE", "UPDATE", entity.getClsfCd(), entity.getCdId(), null, items,
                                                                codeSummary(bfrNm, bfrExpln, bfrUse),
                                                                codeSummary(entity.getCdIdNm(), entity.getCdIdExpln(), entity.getUseYn()));
                                        }
                                });
        }

        /**
         * 코드 탐색기 편집(드래그앤드롭) 결과를 일괄 반영한다. 코드그룹의 소속 분류(clsfCd)만 갱신하며
         * 명칭·설명·사용여부는 건드리지 않는다.
         *
         * <p>종전에는 프론트가 존재하지 않는 PUT /cmmn/batch-hierarchy 를 호출했고, 그 경로가
         * PUT /cmmn/{codeId} 에 codeId="batch-hierarchy" 로 흡수되면서 배열 본문을 CmmnCodeDto 로
         * 역직렬화하다 400 이 났다. 결과적으로 재배치 작업이 통째로 소실됐다.
         *
         * <p>순환 참조는 분류(tb_com_clsf_cd)와 코드그룹(tb_com_cd)이 서로 다른 테이블인 2단 고정 계층이라
         * 구조적으로 발생하지 않지만, 잘못된 payload 로 인한 자기참조·유령 부모는 아래에서 명시적으로 막는다.
         */
        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnCodeHierarchy(List<CmmnCodeHierarchyDto> items) {
                SecurityUtil.assertPermission("CODE_UPDATE");
                if (items == null || items.isEmpty()) {
                        return;
                }
                for (CmmnCodeHierarchyDto item : items) {
                        String cdId = item.getCdId();
                        String clsfCd = item.getClsfCd();

                        // @Valid 는 List 원소까지 캐스케이드되지 않으므로(컨트롤러 애노테이션은 문서화 의도) 여기서 실검증한다.
                        if (cdId == null || cdId.isBlank()) {
                                throw new BusinessException("코드 ID 는 필수입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
                        }
                        // 분류가 비면 트리에서 사라져(목록이 clsfCd 로 매칭) 조용한 데이터 유실이 된다. 루트 이동은 허용하지 않는다.
                        if (clsfCd == null || clsfCd.isBlank()) {
                                throw new BusinessException("코드그룹은 반드시 분류코드에 소속되어야 합니다: " + cdId,
                                                CommonErrorCode.INVALID_INPUT_VALUE);
                        }
                        if (clsfCd.equals(cdId)) {
                                throw new BusinessException("자기 자신을 상위 분류로 지정할 수 없습니다: " + cdId,
                                                CommonErrorCode.INVALID_INPUT_VALUE);
                        }
                        if (!commonCodeCategoryRepository.existsById(clsfCd)) {
                                throw new BusinessException("상위 분류코드가 존재하지 않습니다: " + clsfCd,
                                                CommonErrorCode.RESOURCE_NOT_FOUND);
                        }

                        CommonCodeGroup entity = commonCodeGroupRepository.findById(cdId)
                                        .orElseThrow(() -> new BusinessException(
                                                        "코드그룹이 존재하지 않습니다: " + cdId,
                                                        CodeErrorCode.CODE_NOT_FOUND));
                        String bfrClsf = entity.getClsfCd();
                        entity.updateClassification(clsfCd);
                        if (!java.util.Objects.equals(bfrClsf, clsfCd)) {
                                recordChange("CODE", "UPDATE", clsfCd, cdId, null, "소속 분류",
                                                "분류: " + bfrClsf, "분류: " + clsfCd);
                        }
                }
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnCode(@NonNull CmmnCodeDto dto) {
                SecurityUtil.assertPermission("CODE_DELETE");

                commonCodeGroupRepository.findById(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .ifPresent(group -> {
                                        String bfrUse = group.getUseYn();
                                        group.delete();
                                        if (!java.util.Objects.equals(bfrUse, group.getUseYn())) recordChange("CODE", "REMOVE", group.getClsfCd(), group.getCdId(), null, "그룹 삭제(사용 안 함)",
                                                        "사용: " + bfrUse, "사용: " + group.getUseYn());
                                });
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
                                .map(cat -> cat.getClsfCdNm()).orElse("");
                return CmmnCodeDto.builder()
                                .cdId(entity.getCdId())
                                .cdIdNm(entity.getCdIdNm())
                                .cdIdExpln(entity.getCdIdExpln())
                                .clsfCd(entity.getClsfCd())
                                .clsfCdNm(clCodeNm)
                                .useYn(entity.getUseYn())
                                .frstRgtrId(entity.getFrstRgtrId())
                                .lastMdfrId(entity.getLastMdfrId())
                                .build();
        }

        // --- 공통상세코드 (CmmnDetailCode) ---

        public List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = searchVO.toPageable();
                Page<nuri.business.domain.code.CommonCodeDetailProjection> page = commonCodeRepository
                                .searchCommonCodeDetails(
                                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                                                required(pageable, "pageable 는 null 일 수 없습니다"));
                return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
        }

        public int selectCmmnDetailCodeListTotCnt(@NonNull BaseSearchDto searchVO) {
                Pageable pageable = PageRequest.of(0, 1);
                return (int) commonCodeRepository.searchCommonCodeDetails(
                                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                                .getTotalElements();
        }

        public CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto) {
                return commonCodeRepository
                                .findById(required(
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .map(this::toDto)
                                .orElseThrow(() -> new BusinessException(
                                                CodeErrorCode.CODE_NOT_FOUND,
                                                "공통상세코드를 찾을 수 없습니다: " + dto.getCdId() + "/" + dto.getDtlCd()));
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {
                SecurityUtil.assertPermission("CODE_CREATE");

                if (commonCodeRepository
                                .existsById(required(
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
                                                "CommonCodeId 는 null 일 수 없습니다"))) {
                        throw new BusinessException(CodeErrorCode.DUPLICATE_CODE);
                }
                CommonCode entity = CommonCode.builder()
                                .cdId(required(dto.getCdId(), "dto.getCdId() 는 null 일 수 없습니다"))
                                .dtlCd(required(dto.getDtlCd(), "dto.getDtlCd() 는 null 일 수 없습니다"))
                                .dtlCdNm(required(dto.getDtlCdNm(), "dto.getDtlCdNm() 는 null 일 수 없습니다"))
                                .dtlCdExpln(dto.getDtlCdExpln())
                                .useYn(dto.getUseYn())
                                .build();
                commonCodeRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
                recordChange("DTL", "ADD", null, entity.getCdId(), entity.getDtlCd(), "상세 코드 등록", null,
                                codeSummary(entity.getDtlCdNm(), entity.getDtlCdExpln(), entity.getUseYn()));
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {
                SecurityUtil.assertPermission("CODE_UPDATE");

                commonCodeRepository
                                .findById(required(
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .ifPresent(entity -> {
                                        String bfrNm = entity.getDtlCdNm(), bfrExpln = entity.getDtlCdExpln(), bfrUse = entity.getUseYn();
                                        entity.update(required(dto.getDtlCdNm(), "dto.getDtlCdNm() 는 null 일 수 없습니다"),
                                                        dto.getDtlCdExpln(),
                                                        dto.getUseYn(),
                                                        dto.getLastMdfrId());
                                        String items = changedItems(bfrNm, bfrExpln, bfrUse,
                                                        entity.getDtlCdNm(), entity.getDtlCdExpln(), entity.getUseYn());
                                        if (!items.isEmpty()) {
                                                recordChange("DTL", "UPDATE", null, entity.getCdId(), entity.getDtlCd(), items,
                                                                codeSummary(bfrNm, bfrExpln, bfrUse),
                                                                codeSummary(entity.getDtlCdNm(), entity.getDtlCdExpln(), entity.getUseYn()));
                                        }
                                });
        }

        @Transactional
        @CacheEvict(value = "commonCodes", allEntries = true)
        public void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto) {
                SecurityUtil.assertPermission("CODE_DELETE");

                commonCodeRepository
                                .findById(required(
                                                new nuri.business.domain.code.CommonCodeId(
                                                                dto.getCdId(), dto.getDtlCd()),
                                                "CommonCodeId 는 null 일 수 없습니다"))
                                .ifPresent(code -> {
                                        String bfrUse = code.getUseYn();
                                        code.delete();
                                        if (!java.util.Objects.equals(bfrUse, code.getUseYn())) recordChange("DTL", "REMOVE", null, code.getCdId(), code.getDtlCd(), "상세 코드 삭제(사용 안 함)",
                                                        "사용: " + bfrUse, "사용: " + code.getUseYn());
                                });
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
                                .map(group -> group.getCdIdNm()).orElse("");
 
                return CmmnDetailCodeDto.builder()
                                .cdId(entity.getCdId())
                                .cdIdNm(codeGroupIdNm)
                                .dtlCd(entity.getDtlCd())
                                .dtlCdNm(entity.getDtlCdNm())
                                .dtlCdExpln(entity.getDtlCdExpln())
                                .useYn(entity.getUseYn())
                                .frstRgtrId(entity.getFrstRgtrId())
                                .lastMdfrId(entity.getLastMdfrId())
                                .build();
        }
}
