package com.company.project.service.help;

import com.company.project.domain.help.*;
import com.company.project.service.help.dto.HpcmDto;
import com.company.project.service.help.dto.OnlineManualDto;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("HelpService 테스트")
class HelpServiceTest {

    @Mock
    private HpcmRepository hpcmRepository;
    @Mock
    private OnlineManualRepository onlineManualRepository;

    @InjectMocks
    private HelpService helpService;

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
}
