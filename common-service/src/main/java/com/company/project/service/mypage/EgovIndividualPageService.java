package com.company.project.service.mypage;

import com.company.project.service.mypage.dto.IndividualPageDto;

public interface EgovIndividualPageService {
    void registerIndividualPage(IndividualPageDto dto);

    void updateIndividualPage(IndividualPageDto dto);

    void deleteIndividualPage(String pageId);

    IndividualPageDto getIndividualPage(String userId);
}
