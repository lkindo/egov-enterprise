package nuri.business.service.code;
import nuri.business.domain.code.exception.CodeErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.code.InstitutionCode;
import nuri.business.domain.code.InstitutionCodeRecptnLog;
import nuri.business.domain.code.InstitutionCodeRecptnLogRepository;
import nuri.business.repository.code.InstitutionCodeRepository;
import nuri.business.service.code.dto.InstitutionCodeDto;
import nuri.business.service.code.dto.InstitutionCodeRecptnDto;
import nuri.foundation.security.annotation.AdminOnly;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.business.domain.common.BaseSearchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

@Service
public class InstitutionCodeService extends BaseAbstractService {

    private final InstitutionCodeRepository institutionCodeRepository;
    private final InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository;

    public InstitutionCodeService(InstitutionCodeRepository institutionCodeRepository,
            InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository) {
        this.institutionCodeRepository = required(institutionCodeRepository, "InstitutionCodeRepository 는 null 일 수 없습니다");
        this.institutionCodeRecptnLogRepository = required(institutionCodeRecptnLogRepository,
                "InstitutionCodeRecptnLogRepository 는 null 일 수 없습니다");
    }

    @Transactional(readOnly = true)
    public List<InstitutionCodeDto> selectInstitutionCodeList(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();
        Page<InstitutionCode> page = institutionCodeRepository.searchInstitutionCodes(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                required(pageable, "pageable 는 null 일 수 없습니다"));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    // [2026-07-28 제거] `@CacheEvict(value = "institutionCodes", allEntries = true)` 를 삭제한다.
    //   그 이름을 채우는 `@Cacheable` 이 저장소 어디에도 없었다 — 즉 **아무것도 무효화하지 않으면서**
    //   "캐시를 관리하고 있다"는 거짓 안전감만 주는 死 애노테이션이었다. Caffeine 은 캐시명을 동적
    //   생성하므로 예외 없이 조용히 통과한다.
    //   ⚠ 위치도 틀려 있었다 — 이 메서드는 **수신 로그(Recptn) 등록**이고, 기관코드 자체의 CRUD 는
    //     insertInstitutionCode/updateInstitutionCode/deleteInstitutionCode 다. 훗날 조회 캐싱을
    //     도입한다면 무효화는 그 3곳에 붙어야 하며, 그때 CachingInvalidationMatrixLinterTest 가
    //     짝을 강제한다(현재 이 서비스에 캐싱은 없다).
    @Transactional
    public void insertInstitutionCodeRecptn(InstitutionCodeRecptnDto dto) {
        String occrrncDe = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId id = InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId
                .builder()
                .ocrnYmd(occrrncDe)
                .instCd(dto.getInstCd())
                .jobSn(java.util.concurrent.ThreadLocalRandom.current().nextLong(1, Long.MAX_VALUE)) // Safe positive non-colliding Sn
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
                .instCycl(parseInstCycl(dto.getInstCycl()))
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

    @Transactional
    public void updateInstitutionCodeRecptn(InstitutionCodeRecptnDto dto) {
        institutionCodeRecptnLogRepository.findById(new InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId(
                dto.getOcrnYmd(), dto.getInstCd(), dto.getJobSn())).ifPresent(entity -> {
                    entity.updateProcessSe(dto.getProcSe(), "SYSTEM");
                });
    }

    public List<InstitutionCodeRecptnDto> selectInstitutionCodeRecptnList(BaseSearchDto searchVO) {
        return institutionCodeRecptnLogRepository.findAll().stream().map(this::toLogDto).collect(Collectors.toList());
    }

    public int selectInstitutionCodeListTotCnt(BaseSearchDto searchVO) {
        return (int) institutionCodeRepository.count();
    }

    public InstitutionCodeDto selectInstitutionCodeDetail(InstitutionCodeDto dto) {
        return institutionCodeRepository.findById(dto.getInstCd()).map(this::toDto).orElse(null);
    }

    @Transactional
    @AdminOnly
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
                .instCycl(parseInstCycl(dto.getInstCycl()))
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

    @Transactional
    @AdminOnly
    public void updateInstitutionCode(InstitutionCodeDto dto) {
        institutionCodeRepository.findById(dto.getInstCd()).ifPresent(entity -> {
            entity.update(dto.getAllInstNm(), dto.getLwstInstNm(), dto.getInstAbbrNm(), dto.getOdr(), dto.getOrd(),
                    parseInstCycl(dto.getInstCycl()), dto.getTopInstCd(), dto.getUprInstCd(), dto.getReprsInstCd(),
                    dto.getInstTypeLclsf(), dto.getInstTypeMclsf(), dto.getInstTypeSclsf(), dto.getTelno(),
                    dto.getFaxNo(), dto.getCrtYmd(), dto.getAblYmd(), dto.getAblYn(), dto.getChgYmd(),
                    dto.getChgTm(), dto.getCrtrYmd(), dto.getSortOrdr(), "SYSTEM");
        });
    }

    @Transactional
    @AdminOnly
    public void deleteInstitutionCode(InstitutionCodeDto dto) {
        institutionCodeRepository.deleteById(dto.getInstCd());
    }

    /**
     * 기관차수 API 계약(String) ↔ 물리 도메인 수N2(Integer, V2_19) 경계 변환.
     * V2_16(sys_log prcs_tm)과 동일 패턴 — DTO 는 String 유지로 Breaking Change 차단.
     */
    private static Integer parseInstCycl(String instCycl) {
        return (instCycl == null || instCycl.isBlank()) ? null : Integer.valueOf(instCycl.trim());
    }

    private static String formatInstCycl(Integer instCycl) {
        return instCycl == null ? null : String.valueOf(instCycl);
    }

    private InstitutionCodeDto toDto(InstitutionCode entity) {
        return InstitutionCodeDto.builder()
                .instCd(entity.getInstCd())
                .allInstNm(entity.getAllInstNm())
                .lwstInstNm(entity.getLwstInstNm())
                .instAbbrNm(entity.getInstAbbrNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .instCycl(formatInstCycl(entity.getInstCycl()))
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
                .instCycl(formatInstCycl(entity.getInstCycl()))
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
