package com.company.project.domain.help;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("WordDicary 엔티티 테스트")
class WordDicaryTest {

    @Test
    @DisplayName("WordDicary 빌더 및 초기화 테스트")
    void builderTest() {
        WordDicary dicary = WordDicary.builder()
                .wordId("WORD_001")
                .wordNm("용어")
                .engNm("Term")
                .wordDc("Description")
                .synonm("Alias")
                .frstRegisterId("admin")
                .build();

        assertThat(dicary.getWordId()).isEqualTo("WORD_001");
        assertThat(dicary.getWordNm()).isEqualTo("용어");
        assertThat(dicary.getEngNm()).isEqualTo("Term");
        assertThat(dicary.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("WordDicary 수정 테스트")
    void updateTest() {
        WordDicary dicary = WordDicary.builder()
                .wordId("WORD_001")
                .wordNm("Old Word")
                .build();

        dicary.update("New Word", "New Eng", "New Dc", "New Alias", "user04");

        assertThat(dicary.getWordNm()).isEqualTo("New Word");
        assertThat(dicary.getEngNm()).isEqualTo("New Eng");
        assertThat(dicary.getSynonm()).isEqualTo("New Alias");
        assertThat(dicary.getLastModifiedBy()).isEqualTo("user04");
    }
}
