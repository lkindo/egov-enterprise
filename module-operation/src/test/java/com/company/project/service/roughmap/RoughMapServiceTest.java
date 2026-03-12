package com.company.project.service.roughmap;

import com.company.project.domain.roughmap.RoughMap;
import com.company.project.domain.roughmap.RoughMapRepository;
import com.company.project.service.roughmap.dto.RoughMapDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoughMapService 테스트")
class RoughMapServiceTest {

    @Mock
    private RoughMapRepository roughMapRepository;

    @InjectMocks
    private RoughMapService roughMapService;

    @Test
    @DisplayName("약도 목록 조회 테스트")
    void getRoughMapListTest() {
        Page<RoughMap> page = new PageImpl<>(List.of(RoughMap.builder().roughMapId("R1").roughMapSj("Map1").build()));
        given(roughMapRepository.findAll(any(PageRequest.class))).willReturn(page);

        Page<RoughMapDto> result = roughMapService.getRoughMapList(null, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRoughMapId()).isEqualTo("R1");
    }

    @Test
    @DisplayName("약도 상세 조회 테스트")
    void getRoughMapTest() {
        RoughMap map = RoughMap.builder().roughMapId("R1").roughMapSj("Map1").build();
        given(roughMapRepository.findById("R1")).willReturn(Optional.of(map));

        RoughMapDto result = roughMapService.getRoughMap("R1");

        assertThat(result.getRoughMapId()).isEqualTo("R1");
        assertThat(result.getRoughMapSj()).isEqualTo("Map1");
    }

    @Test
    @DisplayName("약도 등록 테스트")
    void insertRoughMapTest() {
        RoughMapDto dto = RoughMapDto.builder()
                .roughMapSj("New Map")
                .build();

        roughMapService.insertRoughMap(dto);

        verify(roughMapRepository).save(any(RoughMap.class));
    }

    @Test
    @DisplayName("약도 수정 테스트")
    void updateRoughMapTest() {
        RoughMap map = RoughMap.builder().roughMapId("R1").roughMapSj("Map1").build();
        given(roughMapRepository.findById("R1")).willReturn(Optional.of(map));

        RoughMapDto dto = RoughMapDto.builder()
                .roughMapId("R1")
                .roughMapSj("Updated Map")
                .build();

        roughMapService.updateRoughMap(dto);

        assertThat(map.getRoughMapSj()).isEqualTo("Updated Map");
    }

    @Test
    @DisplayName("약도 삭제 테스트")
    void deleteRoughMapTest() {
        roughMapService.deleteRoughMap("R1");

        verify(roughMapRepository).deleteById("R1");
    }
}
