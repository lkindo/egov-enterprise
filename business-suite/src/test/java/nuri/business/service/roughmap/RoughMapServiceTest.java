package nuri.business.service.roughmap;


import nuri.business.domain.roughmap.RoughMap;
import nuri.business.domain.roughmap.RoughMapRepository;
import nuri.business.service.roughmap.dto.RoughMapDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoughMapService 단위 테스트")
class RoughMapServiceTest {

    @InjectMocks
    private RoughMapService roughMapService;

    @Mock
    private RoughMapRepository roughMapRepository;

    @Test
    @DisplayName("약도 목록 조회 성공")
    void getRoughMapList_Success() {
        // given
        Page<RoughMap> page = new PageImpl<>(List.of(RoughMap.builder().roughMapId("ROUGH_01").build()));
        given(roughMapRepository.findAll(any(Pageable.class))).willReturn(page);

        // when
        Page<RoughMapDto> result = roughMapService.getRoughMapList(null, Pageable.unpaged());

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("약도 상세 조회 성공")
    void getRoughMap_Success() {
        // given
        RoughMap roughMap = RoughMap.builder().roughMapId("ROUGH_01").roughMapSj("Subject").build();
        given(roughMapRepository.findById("ROUGH_01")).willReturn(Optional.of(roughMap));

        // when
        RoughMapDto result = roughMapService.getRoughMap("ROUGH_01");

        // then
        assertThat(result.getRoughMapSj()).isEqualTo("Subject");
    }

    @Test
    @DisplayName("약도 생성 성공")
    void insertRoughMap_Success() {
        // given
        RoughMapDto dto = RoughMapDto.builder().roughMapSj("Subject").build();

        // when
        roughMapService.insertRoughMap(dto);

        // then
        verify(roughMapRepository).save(any());
    }

    @Test
    @DisplayName("약도 수정 성공")
    void updateRoughMap_Success() {
        // given
        RoughMap entity = RoughMap.builder().roughMapId("ROUGH_01").build();
        given(roughMapRepository.findById("ROUGH_01")).willReturn(Optional.of(entity));
        RoughMapDto dto = RoughMapDto.builder().roughMapId("ROUGH_01").roughMapSj("New Subject").build();

        // when
        roughMapService.updateRoughMap(dto);

        // then
        assertThat(entity.getRoughMapSj()).isEqualTo("New Subject");
    }

    @Test
    @DisplayName("약도 삭제 성공")
    void deleteRoughMap_Success() {
        // when
        roughMapService.deleteRoughMap("ROUGH_01");

        // then
        verify(roughMapRepository).deleteById("ROUGH_01");
    }
}
