package nuri.foundation.service.code;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import nuri.foundation.domain.code.InstitutionCode;
import nuri.foundation.domain.code.InstitutionCodeRecptnLog;
import nuri.foundation.domain.code.InstitutionCodeRecptnLogRepository;
import nuri.foundation.repository.code.InstitutionCodeRepository;
import nuri.foundation.service.code.dto.InstitutionCodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeRecptnDto;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.foundation.domain.common.BaseSearchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

@Service("egovInstitutionCodeService")
public class InstitutionCodeService extends BaseAbstractService implements EgovInstitutionCodeService {

    private final InstitutionCodeRepository institutionCodeRepository;
    private final InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository;

    public InstitutionCodeService(InstitutionCodeRepository institutionCodeRepository,
            InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository) {
        this.institutionCodeRepository = required(institutionCodeRepository, "InstitutionCodeRepository 는 null 일 수 없습니다");
        this.institutionCodeRecptnLogRepository = required(institutionCodeRecptnLogRepository,
                "InstitutionCodeRecptnLogRepository 는 null 일 수 없습니다");
    }

    @Override
    @Transactional(readOnly = true)
    public List<InstitutionCodeDto> selectInstitutionCodeList(@NonNull BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<InstitutionCode> page = institutionCodeRepository.searchInstitutionCodes(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                required(pageable, "pageable 는 null 일 수 없습니다"));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "institutionCodes", allEntries = true)
    public void insertInstitutionCodeRecptn(InstitutionCodeRecptnDto dto) {
        String occrrncDe = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId id = InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId
                .builder()
                .ocrnYmd(occrrncDe)
                .insttCode(dto.getInsttCode())
                .opertSn(System.currentTimeMillis()) // Simplified Sn
                .build();

        InstitutionCodeRecptnLog entity = InstitutionCodeRecptnLog.builder()
                .id(id)
                .changeSeCode(dto.getChangeSeCode())
                .processSe("0")
                .etcCode(dto.getEtcCode())
                .allInsttNm(dto.getAllInsttNm())
                .lowestInsttNm(dto.getLowestInsttNm())
                .insttAbrvNm(dto.getInsttAbrvNm())
                .odr(dto.getOdr())
                .ord(dto.getOrd())
                .insttOdr(dto.getInsttOdr())
                .bestInsttCode(dto.getBestInsttCode())
                .upperInsttCode(dto.getUpperInsttCode())
                .reprsntInsttCode(dto.getReprsntInsttCode())
                .insttTyLclas(dto.getInsttTyLclas())
                .insttTyMclas(dto.getInsttTyMclas())
                .insttTySclas(dto.getInsttTySclas())
                .telno(dto.getTelno())
                .fxnum(dto.getFxnum())
                .creatDe(dto.getCreatDe())
                .ablDe(dto.getAblDe())
                .ablEnnc(dto.getAblEnnc())
                .changede(dto.getChangede())
                .changeTime(dto.getChangeTime())
                .bsisDe(dto.getBsisDe())
                .sortOrdr(dto.getSortOrdr())
                .frstRegisterId("SYSTEM")
                .build();

        institutionCodeRecptnLogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    @Transactional
    public void updateInstitutionCodeRecptn(InstitutionCodeRecptnDto dto) {
        institutionCodeRecptnLogRepository.findById(new InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId(
                dto.getOcrnYmd(), dto.getInsttCode(), dto.getOpertSn())).ifPresent(entity -> {
                    entity.updateProcessSe(dto.getProcessSe(), "SYSTEM");
                });
    }

    @Override
    public List<InstitutionCodeRecptnDto> selectInstitutionCodeRecptnList(BaseSearchDto searchVO) {
        return institutionCodeRecptnLogRepository.findAll().stream().map(this::toLogDto).collect(Collectors.toList());
    }

    @Override
    public int selectInstitutionCodeListTotCnt(BaseSearchDto searchVO) {
        return (int) institutionCodeRepository.count();
    }

    @Override
    public InstitutionCodeDto selectInstitutionCodeDetail(InstitutionCodeDto dto) {
        return institutionCodeRepository.findById(dto.getInsttCode()).map(this::toDto).orElse(null);
    }

    @Override
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void insertInstitutionCode(InstitutionCodeDto dto) {
        if (institutionCodeRepository.existsById(dto.getInsttCode())) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }
        InstitutionCode entity = InstitutionCode.builder()
                .insttCode(dto.getInsttCode())
                .allInsttNm(dto.getAllInsttNm())
                .lowestInsttNm(dto.getLowestInsttNm())
                .insttAbrvNm(dto.getInsttAbrvNm())
                .odr(dto.getOdr())
                .ord(dto.getOrd())
                .insttOdr(dto.getInsttOdr())
                .bestInsttCode(dto.getBestInsttCode())
                .upperInsttCode(dto.getUpperInsttCode())
                .reprsntInsttCode(dto.getReprsntInsttCode())
                .insttTyLclas(dto.getInsttTyLclas())
                .insttTyMclas(dto.getInsttTyMclas())
                .insttTySclas(dto.getInsttTySclas())
                .telno(dto.getTelno())
                .fxnum(dto.getFxnum())
                .creatDe(dto.getCreatDe())
                .ablDe(dto.getAblDe())
                .ablEnnc(dto.getAblEnnc())
                .changede(dto.getChangede())
                .changeTime(dto.getChangeTime())
                .bsisDe(dto.getBsisDe())
                .sortOrdr(dto.getSortOrdr())
                .createdBy("SYSTEM")
                .build();
        institutionCodeRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void updateInstitutionCode(InstitutionCodeDto dto) {
        institutionCodeRepository.findById(dto.getInsttCode()).ifPresent(entity -> {
            // Update logic here
        });
    }

    @Override
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteInstitutionCode(InstitutionCodeDto dto) {
        institutionCodeRepository.deleteById(dto.getInsttCode());
    }

    private InstitutionCodeDto toDto(InstitutionCode entity) {
        return InstitutionCodeDto.builder()
                .insttCode(entity.getInsttCode())
                .allInsttNm(entity.getAllInsttNm())
                .lowestInsttNm(entity.getLowestInsttNm())
                .insttAbrvNm(entity.getInsttAbrvNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .insttOdr(entity.getInsttOdr())
                .bestInsttCode(entity.getBestInsttCode())
                .upperInsttCode(entity.getUpperInsttCode())
                .reprsntInsttCode(entity.getReprsntInsttCode())
                .insttTyLclas(entity.getInsttTyLclas())
                .insttTyMclas(entity.getInsttTyMclas())
                .insttTySclas(entity.getInsttTySclas())
                .telno(entity.getTelno())
                .fxnum(entity.getFxnum())
                .creatDe(entity.getCreatDe())
                .ablDe(entity.getAblDe())
                .ablEnnc(entity.getAblEnnc())
                .changede(entity.getChangede())
                .changeTime(entity.getChangeTime())
                .bsisDe(entity.getBsisDe())
                .sortOrdr(entity.getSortOrdr())
                .build();
    }

    private InstitutionCodeRecptnDto toLogDto(InstitutionCodeRecptnLog entity) {
        return InstitutionCodeRecptnDto.builder()
                .ocrnYmd(entity.getId().getOcrnYmd())
                .insttCode(entity.getId().getInsttCode())
                .opertSn(entity.getId().getOpertSn())
                .changeSeCode(entity.getChangeSeCode())
                .processSe(entity.getProcessSe())
                .etcCode(entity.getEtcCode())
                .allInsttNm(entity.getAllInsttNm())
                .lowestInsttNm(entity.getLowestInsttNm())
                .insttAbrvNm(entity.getInsttAbrvNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .insttOdr(entity.getInsttOdr())
                .bestInsttCode(entity.getBestInsttCode())
                .upperInsttCode(entity.getUpperInsttCode())
                .reprsntInsttCode(entity.getReprsntInsttCode())
                .insttTyLclas(entity.getInsttTyLclas())
                .insttTyMclas(entity.getInsttTyMclas())
                .insttTySclas(entity.getInsttTySclas())
                .telno(entity.getTelno())
                .fxnum(entity.getFxnum())
                .creatDe(entity.getCreatDe())
                .ablDe(entity.getAblDe())
                .ablEnnc(entity.getAblEnnc())
                .changede(entity.getChangede())
                .changeTime(entity.getChangeTime())
                .bsisDe(entity.getBsisDe())
                .sortOrdr(entity.getSortOrdr())
                .build();
    }
}
