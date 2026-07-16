package nuri.business.service.help;

import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.OnlineManualDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovHelpService {
    // 도움팝업
    Page<HpcmDto> getHpcmList(String keyword, Pageable pageable);

    HpcmDto getHpcm(String hpcmId);

    String createHpcm(String userId, HpcmDto dto);

    void updateHpcm(String hpcmId, String userId, HpcmDto dto);

    void deleteHpcm(String hpcmId);

    // 온라인메뉴얼
    Page<OnlineManualDto> getOnlineManualList(String keyword, Pageable pageable);

    OnlineManualDto getOnlineManual(String mnlId);

    String createOnlineManual(String userId, OnlineManualDto dto);

    void updateOnlineManual(String mnlId, String userId, OnlineManualDto dto);

    void deleteOnlineManual(String mnlId);
}
