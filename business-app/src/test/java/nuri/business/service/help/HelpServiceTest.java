package nuri.business.service.help;

import nuri.business.domain.help.*;
import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.OnlineManualDto;
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

    @org.mockito.Spy
    nuri.business.service.help.dto.HpcmMapper hpcmMapper = new nuri.business.service.help.dto.HpcmMapperImpl();

    @org.mockito.Spy
    nuri.business.service.help.dto.OnlineManualMapper onlineManualMapper = new nuri.business.service.help.dto.OnlineManualMapperImpl();

    @InjectMocks
    private HelpService helpService;

    // --- HPCM (Help) Tests ---

    @Test
    @DisplayName("도움말 목록 조회 테스트")
    void getHpcmList_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Hpcm entity = Hpcm.builder().hlpSn(1L).hlpDfn("Definition").build();
        when(hpcmRepository.findByHlpDfnContaining(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<HpcmDto> result = helpService.getHpcmList("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getHlpDfn()).isEqualTo("Definition");
    }

    @Test
    @DisplayName("도움말 상세 조회 테스트")
    void getHpcm_Success() {
        Hpcm entity = Hpcm.builder().hlpSn(1L).hlpDfn("Def").build();
        when(hpcmRepository.findById(1L)).thenReturn(Optional.of(entity));

        HpcmDto result = helpService.getHpcm(1L);

        assertThat(result.getHlpDfn()).isEqualTo("Def");
    }

    @Test
    @DisplayName("도움말 등록 테스트")
    void createHpcm_Success() {
        HpcmDto dto = HpcmDto.builder().hlpDfn("New Help").build();
        when(hpcmRepository.save(any(Hpcm.class))).thenReturn(Hpcm.builder().hlpSn(1L).build());

        Long hlpSn = helpService.createHpcm("user", dto);

        assertThat(hlpSn).isEqualTo(1L);
        verify(hpcmRepository).save(any(Hpcm.class));
    }

    @Test
    @DisplayName("도움말 수정 테스트")
    void updateHpcm_Success() {
        Hpcm entity = org.mockito.Mockito.spy(Hpcm.builder().hlpSn(1L).build());
        when(hpcmRepository.findById(1L)).thenReturn(Optional.of(entity));
        HpcmDto dto = HpcmDto.builder().hlpDfn("Updated").build();

        helpService.updateHpcm(1L, "user", dto);

        verify(entity).update(any(), any(), any());
    }

    @Test
    @DisplayName("도움말 삭제 테스트")
    void deleteHpcm_Success() {
        Hpcm entity = Hpcm.builder().hlpSn(1L).hlpDfn("Def").build();
        when(hpcmRepository.findById(1L)).thenReturn(Optional.of(entity));

        helpService.deleteHpcm(1L);

        verify(hpcmRepository).delete(entity);
    }

    /**
     * [2026-09-02] 없는 id 의 삭제는 404 다. 종전에는 deleteById 를 바로 불러 Spring Data 3 에서
     * 없는 id 가 조용히 200 으로 끝났다 — 같은 서비스의 조회·수정은 404 를 주는데 삭제만 달랐고,
     * 화면은 성공 토스트를 띄우고 목록은 그대로였다.
     */
    @Test
    @DisplayName("도움말 삭제 - 없는 id 는 404 이고 삭제를 호출하지 않는다")
    void deleteHpcm_NotFound() {
        when(hpcmRepository.findById(99L)).thenReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> helpService.deleteHpcm(99L))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(hpcmRepository, org.mockito.Mockito.never()).delete(any());
        verify(hpcmRepository, org.mockito.Mockito.never()).deleteById(any());
    }

    // --- Online Manual Tests ---

    @Test
    @DisplayName("온라인 매뉴얼 목록 조회 테스트")
    void getOnlineManualList_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlineManual entity = OnlineManual.builder().onlnMnlSn(1L).onlnMnlNm("Name").build();
        when(onlineManualRepository.findByOnlnMnlNmContaining(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<OnlineManualDto> result = helpService.getOnlineManualList("keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("온라인 매뉴얼 상세 조회 테스트")
    void getOnlineManual_Success() {
        OnlineManual entity = OnlineManual.builder().onlnMnlSn(1L).onlnMnlNm("Name").build();
        when(onlineManualRepository.findById(1L)).thenReturn(Optional.of(entity));

        OnlineManualDto result = helpService.getOnlineManual(1L);

        assertThat(result.getOnlnMnlNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("온라인 매뉴얼 등록 테스트")
    void createOnlineManual_Success() {
        OnlineManualDto dto = OnlineManualDto.builder().onlnMnlNm("Manual").build();
        when(onlineManualRepository.save(any(OnlineManual.class)))
                .thenReturn(OnlineManual.builder().onlnMnlSn(1L).build());

        Long onlnMnlSn = helpService.createOnlineManual("user", dto);

        assertThat(onlnMnlSn).isEqualTo(1L);
        verify(onlineManualRepository).save(any(OnlineManual.class));
    }

    @Test
    @DisplayName("온라인 매뉴얼 수정 테스트")
    void updateOnlineManual_Success() {
        OnlineManual entity = org.mockito.Mockito.spy(OnlineManual.builder().onlnMnlSn(1L).build());
        when(onlineManualRepository.findById(1L)).thenReturn(Optional.of(entity));
        OnlineManualDto dto = OnlineManualDto.builder().onlnMnlNm("Updated").build();

        helpService.updateOnlineManual(1L, "user", dto);

        verify(entity).update(any(), any(), any(), any());
    }

    @Test
    @DisplayName("온라인 매뉴얼 삭제 테스트")
    void deleteOnlineManual_Success() {
        OnlineManual entity = org.mockito.Mockito.mock(OnlineManual.class);
        when(onlineManualRepository.findById(1L)).thenReturn(Optional.of(entity));

        helpService.deleteOnlineManual(1L);

        verify(onlineManualRepository).delete(entity);
    }

    /** 없는 id 는 404 — {@link #deleteHpcm_NotFound} 와 같은 이유. */
    @Test
    @DisplayName("온라인 매뉴얼 삭제 - 없는 id 는 404 이고 삭제를 호출하지 않는다")
    void deleteOnlineManual_NotFound() {
        when(onlineManualRepository.findById(99L)).thenReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> helpService.deleteOnlineManual(99L))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(onlineManualRepository, org.mockito.Mockito.never()).delete(any());
        verify(onlineManualRepository, org.mockito.Mockito.never()).deleteById(any());
    }
}
