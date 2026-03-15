package com.company.project.service.help;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.help.*;
import com.company.project.service.help.dto.AdministrationWordDto;
import com.company.project.service.help.dto.HpcmDto;
import com.company.project.service.help.dto.OnlineManualDto;
import com.company.project.service.help.dto.WordDicaryDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("HelpService 테스트")
class HelpServiceTest {

    @Mock
    private AdministrationWordRepository administrationWordRepository;
    @Mock
    private HpcmRepository hpcmRepository;
    @Mock
    private OnlineManualRepository onlineManualRepository;
    @Mock
    private WordDicaryRepository wordDicaryRepository;

    @InjectMocks
    private HelpService helpService;

    // --- Administration Word Tests ---

    @Test
    @DisplayName("행정용어 목록 조회 테스트")
    void getAdministrationWordList_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        AdministrationWord entity = AdministrationWord.builder().administWordId("ID").administWordNm("Name").build();
        when(administrationWordRepository.findByAdministWordNmContaining(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<AdministrationWordDto> result = helpService.getAdministrationWordList("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAdministWordNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("행정용어 상세 조회 테스트")
    void getAdministrationWord_Success() {
        AdministrationWord entity = AdministrationWord.builder().administWordId("ID").administWordNm("Name").build();
        when(administrationWordRepository.findById("ID")).thenReturn(Optional.of(entity));

        AdministrationWordDto result = helpService.getAdministrationWord("ID");

        assertThat(result.getAdministWordNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("행정용어 상세 조회 실패 - 존재하지 않음")
    void getAdministrationWord_NotFound() {
        when(administrationWordRepository.findById("ID")).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> helpService.getAdministrationWord("ID"));
    }

    @Test
    @DisplayName("행정용어 등록 테스트")
    void createAdministrationWord_Success() {
        AdministrationWordDto dto = AdministrationWordDto.builder().administWordNm("New").build();

        String id = helpService.createAdministrationWord("user", dto);

        assertThat(id).startsWith("AWORD_");
        verify(administrationWordRepository).save(any(AdministrationWord.class));
    }

    @Test
    @DisplayName("행정용어 수정 테스트")
    void updateAdministrationWord_Success() {
        AdministrationWord entity = spy(AdministrationWord.builder().administWordId("ID").build());
        when(administrationWordRepository.findById("ID")).thenReturn(Optional.of(entity));
        AdministrationWordDto dto = AdministrationWordDto.builder().administWordNm("Updated").build();

        helpService.updateAdministrationWord("ID", "user", dto);

        verify(entity).update(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("행정용어 삭제 테스트")
    void deleteAdministrationWord_Success() {
        helpService.deleteAdministrationWord("ID");
        verify(administrationWordRepository).deleteById("ID");
    }

    // --- HPCM (Help) Tests ---

    @Test
    @DisplayName("도움말 목록 조회 테스트")
    void getHpcmList_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Hpcm entity = Hpcm.builder().hpcmId("ID").hpcmDf("Definition").build();
        when(hpcmRepository.findByHpcmDfContaining(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<HpcmDto> result = helpService.getHpcmList("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getHpcmDf()).isEqualTo("Definition");
    }

    @Test
    @DisplayName("도움말 상세 조회 테스트")
    void getHpcm_Success() {
        Hpcm entity = Hpcm.builder().hpcmId("ID").hpcmDf("Def").build();
        when(hpcmRepository.findById("ID")).thenReturn(Optional.of(entity));

        HpcmDto result = helpService.getHpcm("ID");

        assertThat(result.getHpcmDf()).isEqualTo("Def");
    }

    @Test
    @DisplayName("도움말 등록 테스트")
    void createHpcm_Success() {
        HpcmDto dto = HpcmDto.builder().hpcmDf("New Help").build();

        String id = helpService.createHpcm("user", dto);

        assertThat(id).startsWith("HPCM_");
        verify(hpcmRepository).save(any(Hpcm.class));
    }

    @Test
    @DisplayName("도움말 수정 테스트")
    void updateHpcm_Success() {
        Hpcm entity = spy(Hpcm.builder().hpcmId("ID").build());
        when(hpcmRepository.findById("ID")).thenReturn(Optional.of(entity));
        HpcmDto dto = HpcmDto.builder().hpcmDf("Updated").build();

        helpService.updateHpcm("ID", "user", dto);

        verify(entity).update(any(), any(), any());
    }

    @Test
    @DisplayName("도움말 삭제 테스트")
    void deleteHpcm_Success() {
        helpService.deleteHpcm("ID");
        verify(hpcmRepository).deleteById("ID");
    }

    // --- Online Manual Tests ---

    @Test
    @DisplayName("온라인 매뉴얼 목록 조회 테스트")
    void getOnlineManualList_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlineManual entity = OnlineManual.builder().onlineMnlId("ID").onlineMnlNm("Name").build();
        when(onlineManualRepository.findByOnlineMnlNmContaining(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<OnlineManualDto> result = helpService.getOnlineManualList("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("온라인 매뉴얼 상세 조회 테스트")
    void getOnlineManual_Success() {
        OnlineManual entity = OnlineManual.builder().onlineMnlId("ID").onlineMnlNm("Name").build();
        when(onlineManualRepository.findById("ID")).thenReturn(Optional.of(entity));

        OnlineManualDto result = helpService.getOnlineManual("ID");

        assertThat(result.getOnlineMnlNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("온라인 매뉴얼 등록 테스트")
    void createOnlineManual_Success() {
        OnlineManualDto dto = OnlineManualDto.builder().onlineMnlNm("Manual").build();

        String id = helpService.createOnlineManual("user", dto);

        assertThat(id).startsWith("MNL_");
        verify(onlineManualRepository).save(any(OnlineManual.class));
    }

    @Test
    @DisplayName("온라인 매뉴얼 수정 테스트")
    void updateOnlineManual_Success() {
        OnlineManual entity = spy(OnlineManual.builder().onlineMnlId("ID").build());
        when(onlineManualRepository.findById("ID")).thenReturn(Optional.of(entity));
        OnlineManualDto dto = OnlineManualDto.builder().onlineMnlNm("Updated").build();

        helpService.updateOnlineManual("ID", "user", dto);

        verify(entity).update(any(), any(), any(), any());
    }

    @Test
    @DisplayName("온라인 매뉴얼 삭제 테스트")
    void deleteOnlineManual_Success() {
        helpService.deleteOnlineManual("ID");
        verify(onlineManualRepository).deleteById("ID");
    }

    // --- Word Dictionary Tests ---

    @Test
    @DisplayName("용어사전 목록 조회 테스트")
    void getWordDicaryList_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        WordDicary entity = WordDicary.builder().wordId("ID").wordNm("Name").build();
        when(wordDicaryRepository.findByWordNmContaining(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<WordDicaryDto> result = helpService.getWordDicaryList("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("용어사전 상세 조회 테스트")
    void getWordDicary_Success() {
        WordDicary entity = WordDicary.builder().wordId("ID").wordNm("Name").build();
        when(wordDicaryRepository.findById("ID")).thenReturn(Optional.of(entity));

        WordDicaryDto result = helpService.getWordDicary("ID");

        assertThat(result.getWordNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("용어사전 등록 테스트")
    void createWordDicary_Success() {
        WordDicaryDto dto = WordDicaryDto.builder().wordNm("Word").build();

        String id = helpService.createWordDicary("user", dto);

        assertThat(id).startsWith("WDIC_");
        verify(wordDicaryRepository).save(any(WordDicary.class));
    }

    @Test
    @DisplayName("용어사전 수정 테스트")
    void updateWordDicary_Success() {
        WordDicary entity = spy(WordDicary.builder().wordId("ID").build());
        when(wordDicaryRepository.findById("ID")).thenReturn(Optional.of(entity));
        WordDicaryDto dto = WordDicaryDto.builder().wordNm("Updated").build();

        helpService.updateWordDicary("ID", "user", dto);

        verify(entity).update(any(), any(), any(), any());
    }

    @Test
    @DisplayName("용어사전 삭제 테스트")
    void deleteWordDicary_Success() {
        helpService.deleteWordDicary("ID");
        verify(wordDicaryRepository).deleteById("ID");
    }
}
