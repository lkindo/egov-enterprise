package com.company.project.domain.campaign;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CampaignExternalHrRepository extends JpaRepository<CampaignExternalHr, String> {
    List<CampaignExternalHr> findByCampaign_EventId(String eventId);

    void deleteByCampaign_EventId(String eventId);
}
