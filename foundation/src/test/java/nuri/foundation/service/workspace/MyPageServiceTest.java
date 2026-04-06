package nuri.foundation.service.workspace;

import nuri.foundation.domain.workspace.MyPageContent;
import nuri.foundation.repository.workspace.MyPageContentRepository;
import nuri.foundation.service.workspace.dto.MyPageContentDto;
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
@DisplayName("MyPageService (마이페이지 서비스) 테스트")
class MyPageServiceTest {

    @Mock
    private MyPageContentRepository myPageContentRepository;

    @InjectMocks
    private MyPageService myPageService;

    @Test
    @DisplayName("활성 마이페이지 콘텐츠 조회 테스트")
    void getActiveMyPageContents_Success() {
        // given
        MyPageContent entity = MyPageContent.builder()
                .cntntsId("MYP_001")
                .cntntsNm("테스트 콘텐츠")
                .cntntsUseAt("Y")
                .build();
        given(myPageContentRepository.findByCntntsUseAt("Y")).willReturn(Collections.singletonList(entity));

        // when
        List<MyPageContentDto> result = myPageService.getActiveMyPageContents();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCntntsNm()).isEqualTo("테스트 콘텐츠");
    }

    @Test
    @DisplayName("마이페이지 콘텐츠 등록 테스트")
    void createContent_Success() {
        // given
        MyPageContentDto dto = MyPageContentDto.builder()
                .cntntsId("MYP_001")
                .cntntsNm("테스트 콘텐츠")
                .build();
        MyPageContent entity = MyPageContent.builder()
                .cntntsId("MYP_001")
                .cntntsNm("테스트 콘텐츠")
                .build();
        given(myPageContentRepository.save(any(MyPageContent.class))).willReturn(entity);

        // when
        String result = myPageService.createContent(dto);

        // then
        assertThat(result).isEqualTo("MYP_001");
        verify(myPageContentRepository).save(any(MyPageContent.class));
    }

    @Test
    @DisplayName("마이페이지 콘텐츠 수정 테스트")
    void updateContent_Success() {
        // given
        MyPageContent entity = MyPageContent.builder()
                .cntntsId("MYP_001")
                .cntntsNm("이전 이름")
                .build();
        MyPageContentDto updateDto = MyPageContentDto.builder()
                .cntntsNm("수정된 이름")
                .build();
        given(myPageContentRepository.findById("MYP_001")).willReturn(Optional.of(entity));

        // when
        myPageService.updateContent("MYP_001", updateDto);

        // then
        assertThat(entity.getCntntsNm()).isEqualTo("수정된 이름");
    }

    @Test
    @DisplayName("마이페이지 콘텐츠 삭제 테스트")
    void deleteContent_Success() {
        // when
        myPageService.deleteContent("MYP_001");

        // then
        verify(myPageContentRepository).deleteById("MYP_001");
    }
}
