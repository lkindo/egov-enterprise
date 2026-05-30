package nuri.business.service.operation;

import nuri.business.domain.operation.ExternalHr;
import nuri.business.repository.operation.ExternalHrRepository;
import nuri.business.service.operation.dto.ExternalHrDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExternalHrService {

    private final ExternalHrRepository externalHrRepository;

    public List<ExternalHrDto> getAllExternalHr() {
        return externalHrRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<ExternalHrDto> searchByName(String name) {
        return externalHrRepository.findByOtsdHrNmContaining(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExternalHrDto createExternalHr(ExternalHrDto dto) {
        ExternalHr hr = ExternalHr.builder()
                .evntId(dto.getEvntId())
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
                .frstRegisterId(dto.getFrstRegisterId())
                .lastUpdusrId(dto.getLastUpdusrId())
                .build();
        return convertToDto(externalHrRepository.save(hr));
    }

    private ExternalHrDto convertToDto(ExternalHr hr) {
        return ExternalHrDto.builder()
                .evntId(hr.getEvntId())
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
                .frstRegisterId(hr.getFrstRegisterId())
                .frstRegistPnttm(hr.getFrstRegistPnttm())
                .lastUpdusrId(hr.getLastUpdusrId())
                .lastUpdtPnttm(hr.getLastUpdtPnttm())
                .build();
    }
}
