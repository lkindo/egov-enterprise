package com.company.project.business.domain.calendar;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalendarDomainTest {

    @Test
    @DisplayName("Restde(휴일) 엔티티 생성 및 업데이트 테스트")
    void restde_test() {
        // Given
        Restde restde = Restde.builder()
                .restdeNo(1)
                .restdeDe("20240101")
                .restdeNm("신정")
                .build();
        
        assertEquals("20240101", restde.getRestdeDe());

        // When - update coverage (5 lines)
        restde.update("20241225", "크리스마스", "예수 탄생일", "2");

        // Then
        assertEquals("20241225", restde.getRestdeDe());
        assertEquals("크리스마스", restde.getRestdeNm());
        assertEquals("예수 탄생일", restde.getRestdeDc());
        assertEquals("2", restde.getRestdeSeCode());
    }
}
