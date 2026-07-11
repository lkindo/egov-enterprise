package nuri.business.service.system.service.survey;

import nuri.business.service.system.service.survey.dto.OnlinePollArticleDto;
import nuri.business.service.system.service.survey.dto.OnlinePollManageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovOnlinePollService {
    Page<OnlinePollManageDto> getPollList(String keyword, Pageable pageable);
    OnlinePollManageDto getPoll(String pollId);
    void insertPoll(OnlinePollManageDto dto);
    void updatePoll(OnlinePollManageDto dto);
    void deletePoll(String pollId);

    List<OnlinePollArticleDto> getPollItemList(String pollId);
    void insertPollItem(OnlinePollArticleDto dto);
    void updatePollItem(OnlinePollArticleDto dto);
    void deletePollItem(String pollArtclId);

    void vote(String pollId, String pollArtclId, String userId);
}
