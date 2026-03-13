package com.company.project.domain.help;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("WordDicary 엔티티 테스트")
class WordDicaryTest {

    @Test
    @DisplayName("WordDicary 빌더 및 초기화 테스트")
    void builderTest() {
        WordDicary word = WordDicary.builder()
                .wordId("WORD_001")
                .wordNm("Word 1")
                .createdBy("admin")
                .build();

        assertThat(word.getWordId()).isEqualTo("WORD_001");
        assertThat(word.getWordNm()).isEqualTo("Word 1");
        assertThat(word.getFrstRegisterId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("WordDicary 수정 테스트")
    void updateTest() {
        WordDicary word = WordDicary.builder()
                .wordId("WORD_001")
                .build();

        word.update("New Word", "Eng", "Dc", "Syn", "user02");

        assertThat(word.getWordNm()).isEqualTo("New Word");
        assertThat(word.getLastModifiedBy()).isEqualTo("user02");
    }
}
