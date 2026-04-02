package com.company.project.foundation.domain.user.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserAbsence ?”í‹°???¨ìœ„ ?ŒìŠ¤??)
class UserAbsenceTest {

    @Test
    @DisplayName("UserAbsence ?ì„± ë°??˜ì • ?ŒìŠ¤??)
    void createAndUpdateTest() {
        // Given
        String emplyrId = "USR_00001";
        String initialStatus = "N";
        String updatedStatus = "Y";

        // When
        UserAbsence absence = UserAbsence.builder()
                .emplyrId(emplyrId)
                .userAbsnceAt(initialStatus)
                .build();

        // Then
        assertThat(absence.getEmplyrId()).isEqualTo(emplyrId);
        assertThat(absence.getUserAbsnceAt()).isEqualTo(initialStatus);

        // When
        absence.updateAbsence(updatedStatus);

        // Then
        assertThat(absence.getUserAbsnceAt()).isEqualTo(updatedStatus);
    }
}
