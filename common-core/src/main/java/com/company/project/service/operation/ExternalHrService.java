package com.company.project.service.operation;

import com.company.project.domain.operation.ExternalHr;
import com.company.project.repository.operation.ExternalHrRepository;
import com.company.project.service.operation.dto.ExternalHrDto;
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
        return externalHrRepository.findByExtrlHrNmContaining(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExternalHrDto createExternalHr(ExternalHrDto dto) {
        ExternalHr hr = ExternalHr.builder()
                .eventId(dto.getEventId())
                .extrlHrId(dto.getExtrlHrId())
                .extrlHrNm(dto.getExtrlHrNm())
                .sexdstnCode(dto.getSexdstnCode())
                .occpTyCode(dto.getOccpTyCode())
                .psitnInsttNm(dto.getPsitnInsttNm())
                .brthdy(dto.getBrthdy())
                .areaNo(dto.getAreaNo())
                .middleTelno(dto.getMiddleTelno())
                .endTelno(dto.getEndTelno())
                .emailAdres(dto.getEmailAdres())
                .frstRegisterId(dto.getFrstRegisterId())
                .lastUpdusrId(dto.getLastUpdusrId())
                .build();
        return convertToDto(externalHrRepository.save(hr));
    }

    private ExternalHrDto convertToDto(ExternalHr hr) {
        return ExternalHrDto.builder()
                .eventId(hr.getEventId())
                .extrlHrId(hr.getExtrlHrId())
                .extrlHrNm(hr.getExtrlHrNm())
                .sexdstnCode(hr.getSexdstnCode())
                .occpTyCode(hr.getOccpTyCode())
                .psitnInsttNm(hr.getPsitnInsttNm())
                .brthdy(hr.getBrthdy())
                .areaNo(hr.getAreaNo())
                .middleTelno(hr.getMiddleTelno())
                .endTelno(hr.getEndTelno())
                .emailAdres(hr.getEmailAdres())
                .frstRegisterId(hr.getFrstRegisterId())
                .frstRegistPnttm(hr.getFrstRegistPnttm())
                .lastUpdusrId(hr.getLastUpdusrId())
                .lastUpdtPnttm(hr.getLastUpdtPnttm())
                .build();
    }
}
