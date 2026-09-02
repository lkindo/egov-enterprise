package nuri.business.service.isg;

import nuri.business.domain.isg.InternetSvcGuidance;
import nuri.business.domain.isg.InternetSvcGuidanceRepository;
import nuri.business.service.isg.dto.InternetSvcGuidanceDto;
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
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("InternetSvcGuidanceService 단위 테스트")
class InternetSvcGuidanceServiceTest {

    @InjectMocks
    private InternetSvcGuidanceService internetSvcGuidanceService;

    @Mock
    private InternetSvcGuidanceRepository internetSvcGuidanceRepository;

    @Test
    @DisplayName("인터넷 서비스 안내 단건 조회 - 존재할 때")
    void getIntnetSvcGuidance_Exists() {
        // given
        Long id = 1L;
        InternetSvcGuidance entity = InternetSvcGuidance.builder()
                .itntSrvcSn(id)
                .itntSvcNm("Test ISG")
                .build();
        given(internetSvcGuidanceRepository.findById(id)).willReturn(Optional.of(entity));

        // when
        InternetSvcGuidanceDto result = internetSvcGuidanceService.getIntnetSvcGuidance(id);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getItntSrvcSn()).isEqualTo(id);
        assertThat(result.getIntnetSvcNm()).isEqualTo("Test ISG");
    }

    @Test
    @DisplayName("인터넷 서비스 안내 단건 조회 - 존재하지 않을 때")
    void getIntnetSvcGuidance_NotExists() {
        // given
        given(internetSvcGuidanceRepository.findById(99L)).willReturn(Optional.empty());

        nuri.foundation.core.exception.BusinessException error =
                org.junit.jupiter.api.Assertions.assertThrows(
                        nuri.foundation.core.exception.BusinessException.class,
                        () -> internetSvcGuidanceService.getIntnetSvcGuidance(99L));

        assertThat(error.getErrorCode())
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("인터넷 서비스 안내 등록 - 성공")
    void registerIntnetSvcGuidance() {
        // given
        InternetSvcGuidanceDto dto = InternetSvcGuidanceDto.builder()
                .intnetSvcNm("New ISG")
                .intnetSvcDc("Description")
                .reflctAt("Y")
                .build();
        given(internetSvcGuidanceRepository.save(any(InternetSvcGuidance.class)))
                .willReturn(InternetSvcGuidance.builder().itntSrvcSn(1L).build());

        // when
        Long itntSrvcSn = internetSvcGuidanceService.registerIntnetSvcGuidance(dto);

        // then
        verify(internetSvcGuidanceRepository, times(1)).save(any(InternetSvcGuidance.class));
        assertThat(itntSrvcSn).isEqualTo(1L);
    }

    @Test
    @DisplayName("인터넷 서비스 안내 수정 - 성공")
    void updateIntnetSvcGuidance() {
        // given
        Long id = 1L;
        InternetSvcGuidance existingEntity = InternetSvcGuidance.builder()
                .itntSrvcSn(id)
                .itntSvcNm("Old ISG")
                .itntSvcExpln("Old Desc")
                .build();
        given(internetSvcGuidanceRepository.findById(id)).willReturn(Optional.of(existingEntity));

        InternetSvcGuidanceDto updateDto = InternetSvcGuidanceDto.builder()
                .itntSrvcSn(id)
                .intnetSvcNm("Updated ISG")
                .intnetSvcDc("Updated Desc")
                .reflctAt("N")
                .build();

        // when
        internetSvcGuidanceService.updateIntnetSvcGuidance(updateDto);

        // then
        assertThat(existingEntity.getItntSvcNm()).isEqualTo("Updated ISG");
        assertThat(existingEntity.getItntSvcExpln()).isEqualTo("Updated Desc");
        assertThat(existingEntity.getRfltYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("인터넷 서비스 안내 삭제 - 성공")
    void deleteIntnetSvcGuidance() {
        // given
        Long id = 1L;
        InternetSvcGuidance entity = InternetSvcGuidance.builder().itntSrvcSn(id).itntSvcNm("ISG").build();
        given(internetSvcGuidanceRepository.findById(id)).willReturn(Optional.of(entity));

        // when
        internetSvcGuidanceService.deleteIntnetSvcGuidance(id);

        // then
        verify(internetSvcGuidanceRepository, times(1)).delete(entity);
    }

    /**
     * [2026-09-02] 없는 id 의 수정은 404 다. 종전 {@code ifPresent} 는 존재하지 않는 항목의 수정 요청을
     * <b>조용히 무시하고 200</b> 을 돌려줬다 — 호출자는 저장됐다고 믿었다.
     * 같은 pack 의 Banner·Popup 이 쓰는 orElseThrow(RESOURCE_NOT_FOUND) 규약에 맞춘다.
     */
    @Test
    @DisplayName("인터넷 서비스 안내 수정 - 없는 id 는 404")
    void updateIntnetSvcGuidance_NotFound() {
        given(internetSvcGuidanceRepository.findById(99L)).willReturn(Optional.empty());
        InternetSvcGuidanceDto dto = InternetSvcGuidanceDto.builder()
                .itntSrvcSn(99L).intnetSvcNm("X").intnetSvcDc("Y").reflctAt("N").build();

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> internetSvcGuidanceService.updateIntnetSvcGuidance(dto))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("인터넷 서비스 안내 삭제 - 없는 id 는 404 이고 삭제를 호출하지 않는다")
    void deleteIntnetSvcGuidance_NotFound() {
        given(internetSvcGuidanceRepository.findById(99L)).willReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> internetSvcGuidanceService.deleteIntnetSvcGuidance(99L))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(internetSvcGuidanceRepository, org.mockito.Mockito.never()).delete(org.mockito.ArgumentMatchers.any());
        verify(internetSvcGuidanceRepository, org.mockito.Mockito.never()).deleteById(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("인터넷 서비스 안내 목록 조회 - 키워드 없음")
    void getIntnetSvcGuidanceList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        InternetSvcGuidance entity = InternetSvcGuidance.builder().itntSrvcSn(1L).itntSvcNm("Test").build();
        given(internetSvcGuidanceRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<InternetSvcGuidanceDto> result = internetSvcGuidanceService.getIntnetSvcGuidanceList(null, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getItntSrvcSn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("인터넷 서비스 안내 목록 조회 - 키워드 있음")
    void getIntnetSvcGuidanceList_WithKeyword() {
        // given
        String keyword = "Test";
        Pageable pageable = PageRequest.of(0, 10);
        InternetSvcGuidance entity = InternetSvcGuidance.builder().itntSrvcSn(1L).itntSvcNm("Test ISG").build();
        given(internetSvcGuidanceRepository.findByItntSvcNmContaining(keyword, pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<InternetSvcGuidanceDto> result = internetSvcGuidanceService.getIntnetSvcGuidanceList(keyword, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getIntnetSvcNm()).isEqualTo("Test ISG");
    }

    @Test
    @DisplayName("인터넷 서비스 안내 결과 목록 (빈 목록 반환)")
    void getIntnetSvcGuidanceResult() {
        List<InternetSvcGuidanceDto> result = internetSvcGuidanceService.getIntnetSvcGuidanceResult();
        assertThat(result).isEmpty();
    }
}
