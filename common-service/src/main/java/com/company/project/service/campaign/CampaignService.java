package com.company.project.service.campaign;

import com.company.project.domain.campaign.Campaign;
import com.company.project.domain.campaign.CampaignExternalHr;
import com.company.project.domain.campaign.CampaignExternalHrRepository;
import com.company.project.domain.campaign.CampaignRepository;
import com.company.project.service.campaign.dto.CampaignDto;
import com.company.project.service.campaign.dto.CampaignExternalHrDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CampaignService implements EgovCampaignService {

        private final CampaignRepository campaignRepository;
        private final CampaignExternalHrRepository campaignExternalHrRepository;

        @Override
        public CampaignDto getCampaign(String eventId) {
                return campaignRepository.findById(Objects.requireNonNull(eventId))
                                .map(this::convertToDto)
                                .orElse(null);
        }

        @Override
        @Transactional
        public void registerCampaign(CampaignDto dto) {
                Campaign campaign = Campaign.builder()
                                .eventId(dto.getEventId())
                                .eventBeginDe(dto.getEventBeginDe())
                                .eventEndDe(dto.getEventEndDe())
                                .svcUseNmprCo(dto.getSvcUseNmprCo())
                                .chargerNm(dto.getChargerNm())
                                .eventCn(dto.getEventCn())
                                .eventTyCode(dto.getEventTyCode())
                                .prparetgCn(dto.getPrparetgCn())
                                .eventConfmAt("N") // Default: Not confirmed
                                .frstRegisterId("SYSTEM") // Placeholder
                                .lastUpdusrId("SYSTEM")
                                .build();

                campaignRepository.save(Objects.requireNonNull(campaign));

                if (dto.getExternalHrs() != null) {
                        List<CampaignExternalHr> hrs = dto.getExternalHrs().stream()
                                        .map(hrDto -> CampaignExternalHr.builder()
                                                        .extrlHrId(hrDto.getExtrlHrId())
                                                        .campaign(campaign)
                                                        .extrlHrNm(hrDto.getExtrlHrNm())
                                                        .sexdstnCode(hrDto.getSexdstnCode())
                                                        .emailAdres(hrDto.getEmailAdres())
                                                        .psitnInsttNm(hrDto.getPsitnInsttNm())
                                                        .frstRegisterId("SYSTEM")
                                                        .lastUpdusrId("SYSTEM")
                                                        .build())
                                        .collect(Collectors.toList());
                        campaignExternalHrRepository.saveAll(Objects.requireNonNull(hrs));
                }
        }

        @Override
        @Transactional
        public void updateCampaign(CampaignDto dto) {
                campaignRepository.findById(Objects.requireNonNull(dto.getEventId()))
                                .ifPresent(c -> {
                                        c.update(dto.getEventBeginDe(), dto.getEventEndDe(), dto.getSvcUseNmprCo(),
                                                        dto.getChargerNm(), dto.getEventCn(), dto.getEventTyCode(),
                                                        dto.getEventConfmAt(), dto.getEventConfmDe(),
                                                        dto.getPrparetgCn(), "SYSTEM");

                                        // Handle external hours update (simple delete and insert for demo)
                                        campaignExternalHrRepository.deleteByCampaign_EventId(
                                                        Objects.requireNonNull(dto.getEventId()));
                                        if (dto.getExternalHrs() != null) {
                                                List<CampaignExternalHr> hrs = dto.getExternalHrs().stream()
                                                                .map(hrDto -> CampaignExternalHr.builder()
                                                                                .extrlHrId(hrDto.getExtrlHrId())
                                                                                .campaign(c)
                                                                                .extrlHrNm(hrDto.getExtrlHrNm())
                                                                                .sexdstnCode(hrDto.getSexdstnCode())
                                                                                .emailAdres(hrDto.getEmailAdres())
                                                                                .psitnInsttNm(hrDto.getPsitnInsttNm())
                                                                                .frstRegisterId("SYSTEM")
                                                                                .lastUpdusrId("SYSTEM")
                                                                                .build())
                                                                .collect(Collectors.toList());
                                                campaignExternalHrRepository
                                                                .saveAll(Objects.requireNonNull(hrs));
                                        }
                                });
        }

        @Override
        @Transactional
        public void deleteCampaign(String eventId) {
                campaignExternalHrRepository.deleteByCampaign_EventId(Objects.requireNonNull(eventId));
                campaignRepository.deleteById(Objects.requireNonNull(eventId));
        }

        @Override
        public Page<CampaignDto> getCampaignList(String searchKeyword, String eventTyCode, Pageable pageable) {
                return campaignRepository.findAll(Objects.requireNonNull(pageable))
                                .map(this::convertToDto);
        }

        private CampaignDto convertToDto(Campaign c) {
                CampaignDto dto = CampaignDto.builder()
                                .eventId(c.getEventId())
                                .eventBeginDe(c.getEventBeginDe())
                                .eventEndDe(c.getEventEndDe())
                                .svcUseNmprCo(c.getSvcUseNmprCo())
                                .chargerNm(c.getChargerNm())
                                .eventCn(c.getEventCn())
                                .eventTyCode(c.getEventTyCode())
                                .prparetgCn(c.getPrparetgCn())
                                .eventConfmAt(c.getEventConfmAt())
                                .eventConfmDe(c.getEventConfmDe())
                                .build();

                dto.setExternalHrs(c.getExternalHrs().stream()
                                .map(hr -> CampaignExternalHrDto.builder()
                                                .extrlHrId(hr.getExtrlHrId())
                                                .extrlHrNm(hr.getExtrlHrNm())
                                                .sexdstnCode(hr.getSexdstnCode())
                                                .emailAdres(hr.getEmailAdres())
                                                .psitnInsttNm(hr.getPsitnInsttNm())
                                                .build())
                                .collect(Collectors.toList()));

                return dto;
        }
}