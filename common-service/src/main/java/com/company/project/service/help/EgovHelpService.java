package com.company.project.service.help;

import com.company.project.service.help.dto.AdministrationWordDto;
import com.company.project.service.help.dto.HpcmDto;
import com.company.project.service.help.dto.OnlineManualDto;
import com.company.project.service.help.dto.WordDicaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovHelpService {
    // 행정용어
    Page<AdministrationWordDto> getAdministrationWordList(String keyword, Pageable pageable);

    AdministrationWordDto getAdministrationWord(String wordId);

    String createAdministrationWord(String userId, AdministrationWordDto dto);

    void updateAdministrationWord(String wordId, String userId, AdministrationWordDto dto);

    void deleteAdministrationWord(String wordId);

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

    // 용어사전
    Page<WordDicaryDto> getWordDicaryList(String keyword, Pageable pageable);

    WordDicaryDto getWordDicary(String wordId);

    String createWordDicary(String userId, WordDicaryDto dto);

    void updateWordDicary(String wordId, String userId, WordDicaryDto dto);

    void deleteWordDicary(String wordId);
}
