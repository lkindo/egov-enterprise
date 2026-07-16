package nuri.business.service.scrap;

import nuri.business.service.scrap.dto.ScrapDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovScrapService {
    Page<ScrapDto> getScrapList(String userId, Pageable pageable);

    default Page<ScrapDto> getMyScrapList(String userId, Pageable pageable) {
        return getScrapList(userId, pageable);
    }

    ScrapDto getScrap(String scrapId);
    void createScrap(String userId, ScrapDto dto) throws Exception;
    void updateScrap(String userId, ScrapDto dto);
    void deleteScrap(String scrapId);
}
