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
    void insertAdministrationWord(AdministrationWordDto dto);
    void updateAdministrationWord(AdministrationWordDto dto);
    void deleteAdministrationWord(String wordId);

    // 도움말
    Page<HpcmDto> getHpcmList(String keyword, Pageable pageable);
    HpcmDto getHpcm(String hpcmId);
    void insertHpcm(HpcmDto dto);
    void updateHpcm(HpcmDto dto);
    void deleteHpcm(String hpcmId);

    // 온라인매뉴얼
    Page<OnlineManualDto> getOnlineManualList(String keyword, Pageable pageable);
    OnlineManualDto getOnlineManual(String mnlId);
    void insertOnlineManual(OnlineManualDto dto);
    void updateOnlineManual(OnlineManualDto dto);
    void deleteOnlineManual(String mnlId);

    // 용어사전
    Page<WordDicaryDto> getWordDicaryList(String keyword, Pageable pageable);
    WordDicaryDto getWordDicary(String wordId);
    void insertWordDicary(WordDicaryDto dto);
    void updateWordDicary(WordDicaryDto dto);
    void deleteWordDicary(String wordId);
}
