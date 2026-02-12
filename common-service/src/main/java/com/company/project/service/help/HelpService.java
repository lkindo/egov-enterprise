package com.company.project.service.help;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.help.*;
import com.company.project.service.help.dto.AdministrationWordDto;
import com.company.project.service.help.dto.HpcmDto;
import com.company.project.service.help.dto.OnlineManualDto;
import com.company.project.service.help.dto.WordDicaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HelpService implements EgovHelpService {

    private final AdministrationWordRepository administrationWordRepository;
    private final HpcmRepository hpcmRepository;
    private final OnlineManualRepository onlineManualRepository;
    private final WordDicaryRepository wordDicaryRepository;

    // 행정용어
    @Override
    public Page<AdministrationWordDto> getAdministrationWordList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return administrationWordRepository.findAll(pageable).map(AdministrationWordDto::from);
        }
        return administrationWordRepository.findByAdministWordNmContaining(keyword, pageable).map(AdministrationWordDto::from);
    }

    @Override
    public AdministrationWordDto getAdministrationWord(String wordId) {
        return administrationWordRepository.findById(wordId)
                .map(AdministrationWordDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertAdministrationWord(AdministrationWordDto dto) {
        String id = "AWM_" + String.format("%013d", System.currentTimeMillis());
        administrationWordRepository.save(AdministrationWord.builder()
                .administWordId(id)
                .administWordNm(dto.getAdministWordNm())
                .administWordEngNm(dto.getAdministWordEngNm())
                .administWordAbrv(dto.getAdministWordAbrv())
                .themaRelm(dto.getThemaRelm())
                .wordDomn(dto.getWordDomn())
                .stdWord(dto.getStdWord())
                .administWordDf(dto.getAdministWordDf())
                .administWordDc(dto.getAdministWordDc())
                .build());
    }

    @Override
    @Transactional
    public void updateAdministrationWord(AdministrationWordDto dto) {
        AdministrationWord entity = administrationWordRepository.findById(dto.getAdministWordId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getAdministWordNm(), dto.getAdministWordEngNm(), dto.getAdministWordAbrv(),
                dto.getThemaRelm(), dto.getWordDomn(), dto.getStdWord(), dto.getAdministWordDf(), dto.getAdministWordDc());
    }

    @Override
    @Transactional
    public void deleteAdministrationWord(String wordId) {
        administrationWordRepository.deleteById(wordId);
    }

    // 도움말
    @Override
    public Page<HpcmDto> getHpcmList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return hpcmRepository.findAll(pageable).map(HpcmDto::from);
        }
        return hpcmRepository.findByHpcmDfContaining(keyword, pageable).map(HpcmDto::from);
    }

    @Override
    public HpcmDto getHpcm(String hpcmId) {
        return hpcmRepository.findById(hpcmId)
                .map(HpcmDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertHpcm(HpcmDto dto) {
        String id = "HPC_" + String.format("%013d", System.currentTimeMillis());
        hpcmRepository.save(Hpcm.builder()
                .hpcmId(id)
                .hpcmSeCode(dto.getHpcmSeCode())
                .hpcmDf(dto.getHpcmDf())
                .hpcmDc(dto.getHpcmDc())
                .build());
    }

    @Override
    @Transactional
    public void updateHpcm(HpcmDto dto) {
        Hpcm entity = hpcmRepository.findById(dto.getHpcmId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getHpcmSeCode(), dto.getHpcmDf(), dto.getHpcmDc());
    }

    @Override
    @Transactional
    public void deleteHpcm(String hpcmId) {
        hpcmRepository.deleteById(hpcmId);
    }

    // 온라인매뉴얼
    @Override
    public Page<OnlineManualDto> getOnlineManualList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return onlineManualRepository.findAll(pageable).map(OnlineManualDto::from);
        }
        return onlineManualRepository.findByOnlineMnlNmContaining(keyword, pageable).map(OnlineManualDto::from);
    }

    @Override
    public OnlineManualDto getOnlineManual(String mnlId) {
        return onlineManualRepository.findById(mnlId)
                .map(OnlineManualDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertOnlineManual(OnlineManualDto dto) {
        String id = "OMM_" + String.format("%013d", System.currentTimeMillis());
        onlineManualRepository.save(OnlineManual.builder()
                .onlineMnlId(id)
                .onlineMnlNm(dto.getOnlineMnlNm())
                .onlineMnlSeCode(dto.getOnlineMnlSeCode())
                .onlineMnlDf(dto.getOnlineMnlDf())
                .onlineMnlDc(dto.getOnlineMnlDc())
                .build());
    }

    @Override
    @Transactional
    public void updateOnlineManual(OnlineManualDto dto) {
        OnlineManual entity = onlineManualRepository.findById(dto.getOnlineMnlId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOnlineMnlNm(), dto.getOnlineMnlSeCode(), dto.getOnlineMnlDf(), dto.getOnlineMnlDc());
    }

    @Override
    @Transactional
    public void deleteOnlineManual(String mnlId) {
        onlineManualRepository.deleteById(mnlId);
    }

    // 용어사전
    @Override
    public Page<WordDicaryDto> getWordDicaryList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return wordDicaryRepository.findAll(pageable).map(WordDicaryDto::from);
        }
        return wordDicaryRepository.findByWordNmContaining(keyword, pageable).map(WordDicaryDto::from);
    }

    @Override
    public WordDicaryDto getWordDicary(String wordId) {
        return wordDicaryRepository.findById(wordId)
                .map(WordDicaryDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertWordDicary(WordDicaryDto dto) {
        String id = "WOR_" + String.format("%013d", System.currentTimeMillis());
        wordDicaryRepository.save(WordDicary.builder()
                .wordId(id)
                .wordNm(dto.getWordNm())
                .engNm(dto.getEngNm())
                .wordDc(dto.getWordDc())
                .synonm(dto.getSynonm())
                .build());
    }

    @Override
    @Transactional
    public void updateWordDicary(WordDicaryDto dto) {
        WordDicary entity = wordDicaryRepository.findById(dto.getWordId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getWordNm(), dto.getEngNm(), dto.getWordDc(), dto.getSynonm());
    }

    @Override
    @Transactional
    public void deleteWordDicary(String wordId) {
        wordDicaryRepository.deleteById(wordId);
    }
}
