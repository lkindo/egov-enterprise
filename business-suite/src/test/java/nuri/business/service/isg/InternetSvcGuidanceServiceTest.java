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
        String id = "ISG_01";
        InternetSvcGuidance entity = InternetSvcGuidance.builder()
                .itntSvcId(id)
                .itntSvcNm("Test ISG")
                .build();
        given(internetSvcGuidanceRepository.findById(id)).willReturn(Optional.of(entity));

        // when
        InternetSvcGuidanceDto result = internetSvcGuidanceService.getIntnetSvcGuidance(id);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getIntnetSvcId()).isEqualTo(id);
        assertThat(result.getIntnetSvcNm()).isEqualTo("Test ISG");
    }

    @Test
    @DisplayName("인터넷 서비스 안내 단건 조회 - 존재하지 않을 때")
    void getIntnetSvcGuidance_NotExists() {
        // given
        given(internetSvcGuidanceRepository.findById("ISG_99")).willReturn(Optional.empty());

        // when
        InternetSvcGuidanceDto result = internetSvcGuidanceService.getIntnetSvcGuidance("ISG_99");

        // then
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("인터넷 서비스 안내 등록 - 성공")
    void registerIntnetSvcGuidance() {
        // given
        InternetSvcGuidanceDto dto = InternetSvcGuidanceDto.builder()
                .intnetSvcId("ISG_01")
                .intnetSvcNm("New ISG")
                .intnetSvcDc("Description")
                .reflctAt("Y")
                .build();

        // when
        internetSvcGuidanceService.registerIntnetSvcGuidance(dto);

        // then
        verify(internetSvcGuidanceRepository, times(1)).save(any(InternetSvcGuidance.class));
    }

    @Test
    @DisplayName("인터넷 서비스 안내 수정 - 성공")
    void updateIntnetSvcGuidance() {
        // given
        String id = "ISG_01";
        InternetSvcGuidance existingEntity = InternetSvcGuidance.builder()
                .itntSvcId(id)
                .itntSvcNm("Old ISG")
                .itntSvcExpln("Old Desc")
                .build();
        given(internetSvcGuidanceRepository.findById(id)).willReturn(Optional.of(existingEntity));

        InternetSvcGuidanceDto updateDto = InternetSvcGuidanceDto.builder()
                .intnetSvcId(id)
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
        String id = "ISG_01";

        // when
        internetSvcGuidanceService.deleteIntnetSvcGuidance(id);

        // then
        verify(internetSvcGuidanceRepository, times(1)).deleteById(id);
    }

    @Test
    @DisplayName("인터넷 서비스 안내 목록 조회 - 키워드 없음")
    void getIntnetSvcGuidanceList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        InternetSvcGuidance entity = InternetSvcGuidance.builder().itntSvcId("ISG_01").itntSvcNm("Test").build();
        given(internetSvcGuidanceRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<InternetSvcGuidanceDto> result = internetSvcGuidanceService.getIntnetSvcGuidanceList(null, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getIntnetSvcId()).isEqualTo("ISG_01");
    }

    @Test
    @DisplayName("인터넷 서비스 안내 목록 조회 - 키워드 있음")
    void getIntnetSvcGuidanceList_WithKeyword() {
        // given
        String keyword = "Test";
        Pageable pageable = PageRequest.of(0, 10);
        InternetSvcGuidance entity = InternetSvcGuidance.builder().itntSvcId("ISG_01").itntSvcNm("Test ISG").build();
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
