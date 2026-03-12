package com.company.project.domain.roughmap;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RoughMap 엔티티 테스트")
class RoughMapTest {

    @Test
    @DisplayName("RoughMap 빌더 및 초기화 테스트")
    void builderTest() {
        RoughMap map = RoughMap.builder()
                .roughMapId("MAP_001")
                .roughMapSj("Map Subject")
                .roughMapAddress("Seoul")
                .la("37.5")
                .lo("127.0")
                .zoomLevel("10")
                .build();

        assertThat(map.getRoughMapId()).isEqualTo("MAP_001");
        assertThat(map.getRoughMapSj()).isEqualTo("Map Subject");
        assertThat(map.getRoughMapAddress()).isEqualTo("Seoul");
        assertThat(map.getLa()).isEqualTo("37.5");
        assertThat(map.getLo()).isEqualTo("127.0");
        assertThat(map.getZoomLevel()).isEqualTo("10");
    }

    @Test
    @DisplayName("RoughMap 수정 테스트")
    void updateTest() {
        RoughMap map = RoughMap.builder()
                .roughMapSj("Old Subject")
                .build();

        map.update("New Subject", "Busan", "35.1", "129.0", "35.2", "129.1", "Info", "12");

        assertThat(map.getRoughMapSj()).isEqualTo("New Subject");
        assertThat(map.getRoughMapAddress()).isEqualTo("Busan");
        assertThat(map.getLa()).isEqualTo("35.1");
        assertThat(map.getLo()).isEqualTo("129.0");
        assertThat(map.getZoomLevel()).isEqualTo("12");
    }
}
