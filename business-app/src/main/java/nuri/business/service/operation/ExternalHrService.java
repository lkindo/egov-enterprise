package nuri.business.service.operation;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.security.util.SecurityUtil;
import nuri.business.domain.operation.ExternalHrId;

import nuri.business.domain.operation.ExternalHr;
import nuri.business.domain.operation.ExternalHrRepository;
import nuri.business.service.operation.dto.ExternalHrDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExternalHrService {

    private final ExternalHrRepository externalHrRepository;

    /**
     * 외부인사 목록 조회(페이징). 성명(name)이 주어지면 부분일치 검색한다.
     * 목록 응답은 컨트롤러에서 {@code PageResponse.of(...)} 로 표준화된다.
     */
    public Page<ExternalHrDto> getExternalHrList(String name, Pageable pageable) {
        Pageable page = Objects.requireNonNull(pageable);
        if (name == null || name.trim().isEmpty()) {
            return externalHrRepository.findAll(page).map(this::convertToDto);
        }
        return externalHrRepository.findByOtsdHrNmContaining(name, page).map(this::convertToDto);
    }

    @Transactional
    public ExternalHrDto createExternalHr(ExternalHrDto dto) {
        ExternalHr hr = ExternalHr.builder()
                .evntSn(dto.getEvntSn())
                .otsdHrId(dto.getOtsdHrId())
                .otsdHrNm(dto.getOtsdHrNm())
                .gndrCd(dto.getGndrCd())
                .crTypeCd(dto.getCrTypeCd())
                .ogdpInstNm(dto.getOgdpInstNm())
                .brdtYmd(dto.getBrdtYmd())
                .areaNo(dto.getAreaNo())
                .mdTelno(dto.getMdTelno())
                .endTelno(dto.getEndTelno())
                .emlAddr(dto.getEmlAddr())
                .frstRgtrId(dto.getFrstRgtrId())
                .lastMdfrId(dto.getLastMdfrId())
                .build();
        return convertToDto(externalHrRepository.save(hr));
    }

    /**
     * 외부인사 수정 — 식별자(evntSn·otsdHrId)는 바꾸지 않는다(2026-09-05 DEC-OPS-036).
     * 수정자는 요청 본문이 아니라 인증 주체에서 온다(클라이언트가 스스로를 다른 사람이라 주장할 수 없게).
     */
    @Transactional
    public ExternalHrDto updateExternalHr(Long evntSn, String otsdHrId, ExternalHrDto dto) {
        ExternalHr hr = findRequired(evntSn, otsdHrId);
        hr.update(dto.getGndrCd(), dto.getOtsdHrNm(), dto.getCrTypeCd(), dto.getOgdpInstNm(), dto.getBrdtYmd(),
                dto.getAreaNo(), dto.getMdTelno(), dto.getEndTelno(), dto.getEmlAddr(),
                SecurityUtil.getCurrentLoginId().orElse(dto.getLastMdfrId()));
        return convertToDto(hr);
    }

    /** 외부인사 삭제. 없는 대상은 RESOURCE_NOT_FOUND — 조용히 성공으로 끝내지 않는다. */
    @Transactional
    public void deleteExternalHr(Long evntSn, String otsdHrId) {
        externalHrRepository.delete(findRequired(evntSn, otsdHrId));
    }

    private ExternalHr findRequired(Long evntSn, String otsdHrId) {
        return externalHrRepository
                .findById(new ExternalHrId(Objects.requireNonNull(evntSn), Objects.requireNonNull(otsdHrId)))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    private ExternalHrDto convertToDto(ExternalHr hr) {
        return ExternalHrDto.builder()
                .evntSn(hr.getEvntSn())
                .otsdHrId(hr.getOtsdHrId())
                .otsdHrNm(hr.getOtsdHrNm())
                .gndrCd(hr.getGndrCd())
                .crTypeCd(hr.getCrTypeCd())
                .ogdpInstNm(hr.getOgdpInstNm())
                .brdtYmd(hr.getBrdtYmd())
                .areaNo(hr.getAreaNo())
                .mdTelno(hr.getMdTelno())
                .endTelno(hr.getEndTelno())
                .emlAddr(hr.getEmlAddr())
                .frstRgtrId(hr.getFrstRgtrId())
                .crtDt(hr.getCrtDt())
                .lastMdfrId(hr.getLastMdfrId())
                .mdfcnDt(hr.getMdfcnDt())
                .build();
    }
}
