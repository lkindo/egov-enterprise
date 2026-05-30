package nuri.business.service.mypage;

import nuri.business.service.mypage.dto.IndividualPageDto;

public interface EgovIndividualPageService {
    void registerIndividualPage(IndividualPageDto dto);

    void updateIndividualPage(IndividualPageDto dto);

    void deleteIndividualPage(String pageId);

    IndividualPageDto getIndividualPage(String userId);
}
