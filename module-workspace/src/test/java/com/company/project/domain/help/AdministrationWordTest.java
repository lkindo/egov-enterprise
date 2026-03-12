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
                .administWordId("WORD_001")
                .administWordNm("행정용어")
                .administWordEngNm("Admin Term")
                .administWordAbrv("AT")
                .themaRelm("General")
                .wordDomn("Public")
                .stdWord("Standard")
                .administWordDf("Definition")
                .administWordDc("Description")
                .frstRegisterId("admin")
                .build();

        assertThat(word.getAdministWordId()).isEqualTo("WORD_001");
        assertThat(word.getAdministWordNm()).isEqualTo("행정용어");
        assertThat(word.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("AdministrationWord 수정 테스트")
    void updateTest() {
        AdministrationWord word = AdministrationWord.builder()
                .administWordId("WORD_001")
                .administWordNm("Old Name")
                .build();

        word.update("New Name", "New Eng", "NA", "New Thema", "New Domn", "New Std", "New Df", "New Dc", "user01");

        assertThat(word.getAdministWordNm()).isEqualTo("New Name");
        assertThat(word.getAdministWordEngNm()).isEqualTo("New Eng");
        assertThat(word.getLastModifiedBy()).isEqualTo("user01");
    }
}
