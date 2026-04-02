package com.company.project.foundation.service.code;

import com.company.project.foundation.domain.code.AdministCode;
import com.company.project.foundation.repository.code.AdministCodeRepository;
import com.company.project.foundation.service.code.dto.AdministCodeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.spy;

@ExtendWith(MockitoExtension.class)
class AdministCodeServiceTest {

    @Mock
    private AdministCodeRepository administCodeRepository;

    @InjectMocks
    private AdministCodeService administCodeService;

    @Test
    @DisplayName("?‰ì •ì½”ë“œ ëª©ë¡ ì¡°íšŒ ?ŒìŠ¤??)
    void getAdministCodeList_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        AdministCode entity = AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("?œìš¸?¹ë³„??)
                .build();
        Page<AdministCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(administCodeRepository.findAll(pageable)).willReturn(page);

        // when
        Page<AdministCodeDto> result = administCodeService.getAdministCodeList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAdministZoneNm()).isEqualTo("?œìš¸?¹ë³„??);
    }

    @Test
    @DisplayName("?‰ì •ì½”ë“œ ê²€??ì¡°íšŒ ?ŒìŠ¤??)
    void getAdministCodeList_WithSearch_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        AdministCode entity = AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("?œìš¸?¹ë³„??)
                .build();
        Page<AdministCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(administCodeRepository.findByAdministZoneNmContaining(eq("?œìš¸"), any())).willReturn(page);

        // when
        Page<AdministCodeDto> result = administCodeService.getAdministCodeList("?œìš¸", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        verify(administCodeRepository).findByAdministZoneNmContaining(eq("?œìš¸"), any());
    }

    @Test
    @DisplayName("?‰ì •ì½”ë“œ ?ì„¸ ì¡°íšŒ ?ŒìŠ¤??- ì¡´ì¬?˜ì? ?ŠëŠ” ê²½ìš°")
    void getAdministCodeDetail_NotFound() {
        // given
        given(administCodeRepository.findById("NOT_FOUND")).willReturn(Optional.empty());

        // when
        AdministCodeDto result = administCodeService.getAdministCodeDetail("NOT_FOUND");

        // then
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("?‰ì •ì½”ë“œ ?±ë¡ ?ŒìŠ¤??)
    void createAdministCode_Success() {
        // given
        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneCode("1100000000")
                .administZoneNm("?œìš¸?¹ë³„??)
                .build();
        AdministCode entity = AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("?œìš¸?¹ë³„??)
                .build();
        given(administCodeRepository.save(any(AdministCode.class))).willReturn(entity);

        // when
        String result = administCodeService.createAdministCode(dto, "webmaster");

        // then
        assertThat(result).isEqualTo("1100000000");
        verify(administCodeRepository).save(any(AdministCode.class));
    }

    @Test
    @DisplayName("?‰ì •ì½”ë“œ ?˜ì • ?ŒìŠ¤??- ?±ê³µ")
    void updateAdministCode_Success() {
        // given
        AdministCode entity = spy(AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("Old Name")
                .build());
        given(administCodeRepository.findById("1100000000")).willReturn(Optional.of(entity));

        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneNm("New Name")
                .build();

        // when
        administCodeService.updateAdministCode("1100000000", dto, "admin");

        // then
        verify(entity).update(any(), eq("New Name"), any(), any(), eq("admin"));
    }

    @Test
    @DisplayName("?‰ì •ì½”ë“œ ?˜ì • ?ŒìŠ¤??- ì¡´ì¬?˜ì? ?ŠëŠ” ê²½ìš° ?¤íŒ¨")
    void updateAdministCode_NotFound_ThrowsException() {
        // given
        given(administCodeRepository.findById("NOT_FOUND")).willReturn(Optional.empty());
        AdministCodeDto dto = AdministCodeDto.builder().build();

        // when & then
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () -> {
            administCodeService.updateAdministCode("NOT_FOUND", dto, "admin");
        });
    }

    @Test
    @DisplayName("?‰ì •ì½”ë“œ ?? œ ?ŒìŠ¤??)
    void deleteAdministCode_Success() {
        // when
        administCodeService.deleteAdministCode("1100000000");

        // then
        verify(administCodeRepository).deleteById("1100000000");
    }
}
