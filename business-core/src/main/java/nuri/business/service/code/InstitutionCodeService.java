package nuri.business.service.code;
import nuri.business.domain.code.exception.CodeErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.code.InstitutionCode;
import nuri.business.domain.code.InstitutionCodeRecptnLog;
import nuri.business.domain.code.InstitutionCodeRecptnLogRepository;
import nuri.business.repository.code.InstitutionCodeRepository;
import nuri.business.service.code.dto.InstitutionCodeDto;
import nuri.business.service.code.dto.InstitutionCodeRecptnDto;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.business.domain.common.BaseSearchDto;
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
                .instCd(dto.getInstCd())
                .jobSn(System.currentTimeMillis()) // Simplified Sn
                .build();

        InstitutionCodeRecptnLog entity = InstitutionCodeRecptnLog.builder()
                .id(id)
                .chgSeCd(dto.getChgSeCd())
                .procSe("0")
                .etcCd(dto.getEtcCd())
                .allInstNm(dto.getAllInstNm())
                .lwstInstNm(dto.getLwstInstNm())
                .instAbbrNm(dto.getInstAbbrNm())
                .odr(dto.getOdr())
                .ord(dto.getOrd())
                .instCycl(dto.getInstCycl())
                .topInstCd(dto.getTopInstCd())
                .uprInstCd(dto.getUprInstCd())
                .reprsInstCd(dto.getReprsInstCd())
                .instTypeLclsf(dto.getInstTypeLclsf())
                .instTypeMclsf(dto.getInstTypeMclsf())
                .instTypeSclsf(dto.getInstTypeSclsf())
                .telno(dto.getTelno())
                .faxNo(dto.getFaxNo())
                .crtYmd(dto.getCrtYmd())
                .ablYmd(dto.getAblYmd())
                .ablYn(dto.getAblYn())
                .chgYmd(dto.getChgYmd())
                .chgTm(dto.getChgTm())
                .crtrYmd(dto.getCrtrYmd())
                .sortOrdr(dto.getSortOrdr())
                .frstRgtrId("SYSTEM")
                .build();

        institutionCodeRecptnLogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    @Transactional
    public void updateInstitutionCodeRecptn(InstitutionCodeRecptnDto dto) {
        institutionCodeRecptnLogRepository.findById(new InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId(
                dto.getOcrnYmd(), dto.getInstCd(), dto.getJobSn())).ifPresent(entity -> {
                    entity.updateProcessSe(dto.getProcSe(), "SYSTEM");
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
        return institutionCodeRepository.findById(dto.getInstCd()).map(this::toDto).orElse(null);
    }

    @Override
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void insertInstitutionCode(InstitutionCodeDto dto) {
        if (institutionCodeRepository.existsById(dto.getInstCd())) {
            throw new BusinessException(CodeErrorCode.DUPLICATE_CODE);
        }
        InstitutionCode entity = InstitutionCode.builder()
                .instCd(dto.getInstCd())
                .allInstNm(dto.getAllInstNm())
                .lwstInstNm(dto.getLwstInstNm())
                .instAbbrNm(dto.getInstAbbrNm())
                .odr(dto.getOdr())
                .ord(dto.getOrd())
                .instCycl(dto.getInstCycl())
                .topInstCd(dto.getTopInstCd())
                .uprInstCd(dto.getUprInstCd())
                .reprsInstCd(dto.getReprsInstCd())
                .instTypeLclsf(dto.getInstTypeLclsf())
                .instTypeMclsf(dto.getInstTypeMclsf())
                .instTypeSclas(dto.getInstTypeSclsf())
                .telno(dto.getTelno())
                .faxNo(dto.getFaxNo())
                .crtYmd(dto.getCrtYmd())
                .ablYmd(dto.getAblYmd())
                .ablYn(dto.getAblYn())
                .chgYmd(dto.getChgYmd())
                .chgTm(dto.getChgTm())
                .crtrYmd(dto.getCrtrYmd())
                .sortOrdr(dto.getSortOrdr())
                .frstRgtrId("SYSTEM")
                .build();
        institutionCodeRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void updateInstitutionCode(InstitutionCodeDto dto) {
        institutionCodeRepository.findById(dto.getInstCd()).ifPresent(entity -> {
            entity.update(dto.getAllInstNm(), dto.getLwstInstNm(), dto.getInstAbbrNm(), dto.getOdr(), dto.getOrd(),
                    dto.getInstCycl(), dto.getTopInstCd(), dto.getUprInstCd(), dto.getReprsInstCd(),
                    dto.getInstTypeLclsf(), dto.getInstTypeMclsf(), dto.getInstTypeSclsf(), dto.getTelno(),
                    dto.getFaxNo(), dto.getCrtYmd(), dto.getAblYmd(), dto.getAblYn(), dto.getChgYmd(),
                    dto.getChgTm(), dto.getCrtrYmd(), dto.getSortOrdr(), "SYSTEM");
        });
    }

    @Override
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteInstitutionCode(InstitutionCodeDto dto) {
        institutionCodeRepository.deleteById(dto.getInstCd());
    }

    private InstitutionCodeDto toDto(InstitutionCode entity) {
        return InstitutionCodeDto.builder()
                .instCd(entity.getInstCd())
                .allInstNm(entity.getAllInstNm())
                .lwstInstNm(entity.getLwstInstNm())
                .instAbbrNm(entity.getInstAbbrNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .instCycl(entity.getInstCycl())
                .topInstCd(entity.getTopInstCd())
                .uprInstCd(entity.getUprInstCd())
                .reprsInstCd(entity.getReprsInstCd())
                .instTypeLclsf(entity.getInstTypeLclsf())
                .instTypeMclsf(entity.getInstTypeMclsf())
                .instTypeSclsf(entity.getInstTypeSclsf())
                .telno(entity.getTelno())
                .faxNo(entity.getFaxNo())
                .crtYmd(entity.getCrtYmd())
                .ablYmd(entity.getAblYmd())
                .ablYn(entity.getAblYn())
                .chgYmd(entity.getChgYmd())
                .chgTm(entity.getChgTm())
                .crtrYmd(entity.getCrtrYmd())
                .sortOrdr(entity.getSortOrdr())
                .build();
    }

    private InstitutionCodeRecptnDto toLogDto(InstitutionCodeRecptnLog entity) {
        return InstitutionCodeRecptnDto.builder()
                .ocrnYmd(entity.getId().getOcrnYmd())
                .instCd(entity.getId().getInstCd())
                .jobSn(entity.getId().getJobSn())
                .chgSeCd(entity.getChgSeCd())
                .procSe(entity.getProcSe())
                .etcCd(entity.getEtcCd())
                .allInstNm(entity.getAllInstNm())
                .lwstInstNm(entity.getLwstInstNm())
                .instAbbrNm(entity.getInstAbbrNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .instCycl(entity.getInstCycl())
                .topInstCd(entity.getTopInstCd())
                .uprInstCd(entity.getUprInstCd())
                .reprsInstCd(entity.getReprsInstCd())
                .instTypeLclsf(entity.getInstTypeLclsf())
                .instTypeMclsf(entity.getInstTypeMclsf())
                .instTypeSclsf(entity.getInstTypeSclsf())
                .telno(entity.getTelno())
                .faxNo(entity.getFaxNo())
                .crtYmd(entity.getCrtYmd())
                .ablYmd(entity.getAblYmd())
                .ablYn(entity.getAblYn())
                .chgYmd(entity.getChgYmd())
                .chgTm(entity.getChgTm())
                .crtrYmd(entity.getCrtrYmd())
                .sortOrdr(entity.getSortOrdr())
                .build();
    }
}
