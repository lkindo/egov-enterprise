package com.company.project.foundation.service.mypage;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.mypage.IndividualPage;
import com.company.project.foundation.domain.mypage.IndividualPageRepository;
import com.company.project.foundation.service.mypage.dto.IndividualPageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("IndividualPageService 단위 테스트")
class IndividualPageServiceTest {

    @InjectMocks
    private IndividualPageService individualPageService;

    @Mock
    private IndividualPageRepository individualPageRepository;

    @Test
    @DisplayName("마이페이지 설정 등록 - 성공")
    void registerIndividualPage() {
        // given
        IndividualPageDto dto = IndividualPageDto.builder()
                .pageId("PGE_01")
                .pageNm("My Page")
                .pageDc("Description")
                .userId("user1")
                .build();

        // when
        individualPageService.registerIndividualPage(dto);

        // then
        verify(individualPageRepository, times(1)).save(any(IndividualPage.class));
    }

    @Test
    @DisplayName("마이페이지 설정 수정 - 성공")
    void updateIndividualPage_Success() {
        // given
        IndividualPage page = IndividualPage.builder()
                .pageId("PGE_01")
                .pageNm("Old Page")
                .pageDc("Old Desc")
                .userId("user1")
                .build();
        given(individualPageRepository.findById("PGE_01")).willReturn(Optional.of(page));

        IndividualPageDto updateDto = IndividualPageDto.builder()
                .pageId("PGE_01")
                .pageNm("Updated Page")
                .pageDc("Updated Desc")
                .build();

        // when
        individualPageService.updateIndividualPage(updateDto);

        // then
        assertThat(page.getPageNm()).isEqualTo("Updated Page");
        assertThat(page.getPageDc()).isEqualTo("Updated Desc");
    }

    @Test
    @DisplayName("마이페이지 설정 수정 - 실패 (존재하지 않음)")
    void updateIndividualPage_Fail_NotFound() {
        // given
        given(individualPageRepository.findById("PGE_99")).willReturn(Optional.empty());
        IndividualPageDto updateDto = IndividualPageDto.builder().pageId("PGE_99").build();

        // when & then
        BusinessException exception = assertThrows(BusinessException.class, () -> individualPageService.updateIndividualPage(updateDto));
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.ENTITY_NOT_FOUND);
    }

    @Test
    @DisplayName("마이페이지 설정 삭제 - 성공")
    void deleteIndividualPage() {
        // given
        String pageId = "PGE_01";

        // when
        individualPageService.deleteIndividualPage(pageId);

        // then
        verify(individualPageRepository, times(1)).deleteById(pageId);
    }

    @Test
    @DisplayName("사용자 ID로 마이페이지 설정 단건 조회 - 성공")
    void getIndividualPage_Success() {
        // given
        String userId = "user1";
        IndividualPage page = IndividualPage.builder()
                .pageId("PGE_01")
                .pageNm("My Page")
                .pageDc("Desc")
                .userId(userId)
                .build();
        given(individualPageRepository.findByUserId(userId)).willReturn(Optional.of(page));

        // when
        IndividualPageDto result = individualPageService.getIndividualPage(userId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getPageId()).isEqualTo("PGE_01");
        assertThat(result.getPageNm()).isEqualTo("My Page");
        assertThat(result.getUserId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("사용자 ID로 마이페이지 설정 단건 조회 - 실패 (존재하지 않음)")
    void getIndividualPage_Fail_NotFound() {
        // given
        String userId = "user99";
        given(individualPageRepository.findByUserId(userId)).willReturn(Optional.empty());

        // when & then
        BusinessException exception = assertThrows(BusinessException.class, () -> individualPageService.getIndividualPage(userId));
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.ENTITY_NOT_FOUND);
    }
}
