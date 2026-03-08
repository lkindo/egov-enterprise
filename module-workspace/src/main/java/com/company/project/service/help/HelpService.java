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
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HelpService implements EgovHelpService {

    private final AdministrationWordRepository administrationWordRepository;
    private final HpcmRepository hpcmRepository;
    private final OnlineManualRepository onlineManualRepository;
    private final WordDicaryRepository wordDicaryRepository;

    // Administration Word
    @Override
    public Page<AdministrationWordDto> getAdministrationWordList(String keyword, Pageable pageable) {
        return administrationWordRepository
                .findByAdministWordNmContaining(Objects.requireNonNullElse(keyword, ""),
                        Objects.requireNonNull(pageable))
                .map(AdministrationWordDto::from);
    }

    @Override
    public AdministrationWordDto getAdministrationWord(String wordId) {
        return administrationWordRepository.findById(Objects.requireNonNull(wordId))
                .map(AdministrationWordDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createAdministrationWord(String userId, AdministrationWordDto dto) {
        String id = "AWORD_" + String.format("%014d", System.currentTimeMillis());
        AdministrationWord entity = AdministrationWord.builder()
                .administWordId(id)
                .administWordNm(dto.getAdministWordNm())
                .administWordEngNm(dto.getAdministWordEngNm())
                .administWordAbrv(dto.getAdministWordAbrv())
                .themaRelm(dto.getThemaRelm())
                .wordDomn(dto.getWordDomn())
                .stdWord(dto.getStdWord())
                .administWordDf(dto.getAdministWordDf())
                .administWordDc(dto.getAdministWordDc())
                .frstRegisterId(userId)
                .build();
        administrationWordRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateAdministrationWord(String wordId, String userId, AdministrationWordDto dto) {
        AdministrationWord entity = administrationWordRepository.findById(Objects.requireNonNull(wordId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getAdministWordNm(), dto.getAdministWordEngNm(), dto.getAdministWordAbrv(),
                dto.getThemaRelm(), dto.getWordDomn(), dto.getStdWord(), dto.getAdministWordDf(),
                dto.getAdministWordDc(), userId);
    }

    @Override
    @Transactional
    public void deleteAdministrationWord(String wordId) {
        administrationWordRepository.deleteById(Objects.requireNonNull(wordId));
    }

    // HPCM (Help)
    @Override
    public Page<HpcmDto> getHpcmList(String keyword, Pageable pageable) {
        return hpcmRepository
                .findByHpcmDfContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(HpcmDto::from);
    }

    @Override
    public HpcmDto getHpcm(String hpcmId) {
        return hpcmRepository.findById(Objects.requireNonNull(hpcmId))
                .map(HpcmDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createHpcm(String userId, HpcmDto dto) {
        String id = "HPCM_" + String.format("%015d", System.currentTimeMillis());
        Hpcm entity = Hpcm.builder()
                .hpcmId(id)
                .hpcmSeCode(dto.getHpcmSeCode())
                .hpcmDf(dto.getHpcmDf())
                .hpcmDc(dto.getHpcmDc())
                .frstRegisterId(userId)
                .build();
        hpcmRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateHpcm(String hpcmId, String userId, HpcmDto dto) {
        Hpcm entity = hpcmRepository.findById(Objects.requireNonNull(hpcmId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getHpcmSeCode(), dto.getHpcmDf(), dto.getHpcmDc(), userId);
    }

    @Override
    @Transactional
    public void deleteHpcm(String hpcmId) {
        hpcmRepository.deleteById(Objects.requireNonNull(hpcmId));
    }

    // Online Manual
    @Override
    public Page<OnlineManualDto> getOnlineManualList(String keyword, Pageable pageable) {
        return onlineManualRepository
                .findByOnlineMnlNmContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(OnlineManualDto::from);
    }

    @Override
    public OnlineManualDto getOnlineManual(String mnlId) {
        return onlineManualRepository.findById(Objects.requireNonNull(mnlId))
                .map(OnlineManualDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createOnlineManual(String userId, OnlineManualDto dto) {
        String id = "MNL_" + String.format("%016d", System.currentTimeMillis());
        OnlineManual entity = OnlineManual.builder()
                .onlineMnlId(id)
                .onlineMnlNm(dto.getOnlineMnlNm())
                .onlineMnlSeCode(dto.getOnlineMnlSeCode())
                .onlineMnlDf(dto.getOnlineMnlDf())
                .onlineMnlDc(dto.getOnlineMnlDc())
                .frstRegisterId(userId)
                .build();
        onlineManualRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateOnlineManual(String mnlId, String userId, OnlineManualDto dto) {
        OnlineManual entity = onlineManualRepository.findById(Objects.requireNonNull(mnlId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOnlineMnlNm(), dto.getOnlineMnlSeCode(), dto.getOnlineMnlDf(), dto.getOnlineMnlDc(),
                userId);
    }

    @Override
    @Transactional
    public void deleteOnlineManual(String mnlId) {
        onlineManualRepository.deleteById(Objects.requireNonNull(mnlId));
    }

    // Word Dictionary
    @Override
    public Page<WordDicaryDto> getWordDicaryList(String keyword, Pageable pageable) {
        return wordDicaryRepository
                .findByWordNmContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(WordDicaryDto::from);
    }

    @Override
    public WordDicaryDto getWordDicary(String wordId) {
        return wordDicaryRepository.findById(Objects.requireNonNull(wordId))
                .map(WordDicaryDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createWordDicary(String userId, WordDicaryDto dto) {
        String id = "WDIC_" + String.format("%015d", System.currentTimeMillis());
        WordDicary entity = WordDicary.builder()
                .wordId(id)
                .wordNm(dto.getWordNm())
                .engNm(dto.getEngNm())
                .wordDc(dto.getWordDc())
                .synonm(dto.getSynonm())
                .frstRegisterId(userId)
                .build();
        wordDicaryRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateWordDicary(String wordId, String userId, WordDicaryDto dto) {
        WordDicary entity = wordDicaryRepository.findById(Objects.requireNonNull(wordId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getWordNm(), dto.getEngNm(), dto.getWordDc(), dto.getSynonm(), userId);
    }

    @Override
    @Transactional
    public void deleteWordDicary(String wordId) {
        wordDicaryRepository.deleteById(Objects.requireNonNull(wordId));
    }
}
