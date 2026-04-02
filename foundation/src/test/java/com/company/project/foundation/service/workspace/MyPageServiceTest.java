package com.company.project.foundation.service.workspace;

import com.company.project.foundation.domain.workspace.MyPageContent;
import com.company.project.foundation.repository.workspace.MyPageContentRepository;
import com.company.project.foundation.service.workspace.dto.MyPageContentDto;
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
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MyPageServiceTest {

    @Mock
    private MyPageContentRepository myPageContentRepository;

    @InjectMocks
    private MyPageService myPageService;

    @Test
    @DisplayName("?œì„± ë§ˆì´?˜ì´ì§€ ì½˜í…ì¸?ì¡°íšŒ ?ŒìŠ¤??)
    void getActiveMyPageContents_Success() {
        // given
        MyPageContent entity = MyPageContent.builder()
                .cntntsId("MYP_001")
                .cntntsNm("?ŒìŠ¤??ì½˜í…ì¸?)
                .cntntsUseAt("Y")
                .build();
        given(myPageContentRepository.findByCntntsUseAt("Y")).willReturn(Collections.singletonList(entity));

        // when
        List<MyPageContentDto> result = myPageService.getActiveMyPageContents();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCntntsNm()).isEqualTo("?ŒìŠ¤??ì½˜í…ì¸?);
    }

    @Test
    @DisplayName("ë§ˆì´?˜ì´ì§€ ì½˜í…ì¸??±ë¡ ?ŒìŠ¤??)
    void createContent_Success() {
        // given
        MyPageContentDto dto = MyPageContentDto.builder()
                .cntntsId("MYP_001")
                .cntntsNm("?ŒìŠ¤??ì½˜í…ì¸?)
                .build();
        MyPageContent entity = MyPageContent.builder()
                .cntntsId("MYP_001")
                .cntntsNm("?ŒìŠ¤??ì½˜í…ì¸?)
                .build();
        given(myPageContentRepository.save(any(MyPageContent.class))).willReturn(entity);

        // when
        String result = myPageService.createContent(dto);

        // then
        assertThat(result).isEqualTo("MYP_001");
        verify(myPageContentRepository).save(any(MyPageContent.class));
    }

    @Test
    @DisplayName("ë§ˆì´?˜ì´ì§€ ì½˜í…ì¸??˜ì • ?ŒìŠ¤??)
    void updateContent_Success() {
        // given
        MyPageContent entity = MyPageContent.builder()
                .cntntsId("MYP_001")
                .cntntsNm("?´ì „ ?´ë¦„")
                .build();
        MyPageContentDto updateDto = MyPageContentDto.builder()
                .cntntsNm("?˜ì •???´ë¦„")
                .build();
        given(myPageContentRepository.findById("MYP_001")).willReturn(Optional.of(entity));

        // when
        myPageService.updateContent("MYP_001", updateDto);

        // then
        assertThat(entity.getCntntsNm()).isEqualTo("?˜ì •???´ë¦„");
    }

    @Test
    @DisplayName("ë§ˆì´?˜ì´ì§€ ì½˜í…ì¸??? œ ?ŒìŠ¤??)
    void deleteContent_Success() {
        // when
        myPageService.deleteContent("MYP_001");

        // then
        verify(myPageContentRepository).deleteById("MYP_001");
    }
}
