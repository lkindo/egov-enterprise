package com.company.project.domain.help;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AdministrationWord 엔티티 테스트")
class AdministrationWordTest {

    @Test
    @DisplayName("AdministrationWord 빌더 및 초기화 테스트")
    void builderTest() {
        AdministrationWord word = AdministrationWord.builder()
                .administWordId("AWORD_001")
                .administWordNm("Admin Word")
                .createdBy("admin")
                .build();

        assertThat(word.getAdministWordId()).isEqualTo("AWORD_001");
        assertThat(word.getAdministWordNm()).isEqualTo("Admin Word");
        assertThat(word.getFrstRegisterId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("AdministrationWord 수정 테스트")
    void updateTest() {
        AdministrationWord word = AdministrationWord.builder()
                .administWordId("AWORD_001")
                .build();

        word.update("Updated Nm", "Eng", "Abrv", "Theme", "Domn", "Std", "Df", "Dc", "user02");

        assertThat(word.getAdministWordNm()).isEqualTo("Updated Nm");
        assertThat(word.getLastModifiedBy()).isEqualTo("user02");
    }
}
