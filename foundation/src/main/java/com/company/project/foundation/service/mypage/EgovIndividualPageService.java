package com.company.project.foundation.service.mypage;

import com.company.project.foundation.service.mypage.dto.IndividualPageDto;

public interface EgovIndividualPageService {
    void registerIndividualPage(IndividualPageDto dto);

    void updateIndividualPage(IndividualPageDto dto);

    void deleteIndividualPage(String pageId);

    IndividualPageDto getIndividualPage(String userId);
}
