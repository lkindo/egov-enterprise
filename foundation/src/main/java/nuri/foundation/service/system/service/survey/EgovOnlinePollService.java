package nuri.foundation.service.system.service.survey;

import nuri.foundation.service.system.service.survey.dto.OnlinePollItemDto;
import nuri.foundation.service.system.service.survey.dto.OnlinePollManageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovOnlinePollService {
    Page<OnlinePollManageDto> getPollList(String keyword, Pageable pageable);
    OnlinePollManageDto getPoll(String pollId);
    void insertPoll(OnlinePollManageDto dto);
    void updatePoll(OnlinePollManageDto dto);
    void deletePoll(String pollId);

    List<OnlinePollItemDto> getPollItemList(String pollId);
    void insertPollItem(OnlinePollItemDto dto);
    void updatePollItem(OnlinePollItemDto dto);
    void deletePollItem(String pollIemId);

    void vote(String pollId, String pollIemId, String userId);
}
