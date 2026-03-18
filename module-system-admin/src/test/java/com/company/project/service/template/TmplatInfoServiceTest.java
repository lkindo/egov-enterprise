package com.company.project.service.template;

import com.company.project.domain.template.TmplatInfo;
import com.company.project.domain.template.TmplatInfoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TmplatInfoService 단위 테스트")
class TmplatInfoServiceTest {

    @Mock
    private TmplatInfoRepository tmplatInfoRepository;

    @InjectMocks
    private TmplatInfoService tmplatInfoService;

    @Test
    @DisplayName("템플릿 목록 조회 테스트")
    void selectTmplatInfoListTest() {
        // Given
        when(tmplatInfoRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<TmplatInfo> result = tmplatInfoService.selectTmplatInfoList();

        // Then
        assertThat(result).isEmpty();
        verify(tmplatInfoRepository).findAll();
    }

    @Test
    @DisplayName("템플릿 상세 조회 테스트")
    void selectTmplatInfoDetailTest() {
        // Given
        String tmplatId = "TMPLT_001";
        TmplatInfo info = TmplatInfo.builder().tmplatId(tmplatId).build();
        when(tmplatInfoRepository.findById(tmplatId)).thenReturn(Optional.of(info));

        // When
        TmplatInfo result = tmplatInfoService.selectTmplatInfoDetail(tmplatId);

        // Then
        assertThat(result.getTmplatId()).isEqualTo(tmplatId);
    }

    @Test
    @DisplayName("템플릿 등록 테스트")
    void insertTmplatInfoTest() {
        // Given
        TmplatInfo info = TmplatInfo.builder().tmplatNm("Test").build();

        // When
        tmplatInfoService.insertTmplatInfo(info);

        // Then
        verify(tmplatInfoRepository).save(any());
    }
}
