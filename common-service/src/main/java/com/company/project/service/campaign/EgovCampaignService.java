package com.company.project.service.campaign;

import com.company.project.service.campaign.dto.CampaignDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCampaignService {
    CampaignDto getCampaign(String eventId);

    void registerCampaign(CampaignDto dto);

    void updateCampaign(CampaignDto dto);

    void deleteCampaign(String eventId);

    Page<CampaignDto> getCampaignList(String searchKeyword, String eventTyCode, Pageable pageable);
}