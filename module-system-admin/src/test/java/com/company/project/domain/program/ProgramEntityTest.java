package com.company.project.domain.program;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProgramEntityTest {

    @Test
    @DisplayName("프로그램 정보 수정 테스트")
    void update_success() {
        // given
        Program program = Program.builder()
                .progrmFileNm("old.jsp")
                .progrmKoreanNm("Old Name")
                .build();

        // when
        program.update("/new/path", "New Name", "/new/url", "New Description");

        // then
        assertThat(program.getProgrmKoreanNm()).isEqualTo("New Name");
        assertThat(program.getProgrmStrePath()).isEqualTo("/new/path");
        assertThat(program.getUrl()).isEqualTo("/new/url");
        assertThat(program.getProgrmDc()).isEqualTo("New Description");
    }
}
