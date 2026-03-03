package com.company.project.domain.survey;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("Survey Repository 테스트")
class SurveyRepositoryTest {

    @Autowired
    private OnlinePollManageRepository onlinePollManageRepository;

    @Autowired
    private QestnrInfoRepository qestnrInfoRepository;

    @Test
    @DisplayName("온라인 설문 관리 저장 및 조회")
    void pollManageTest() {
        // Given
        OnlinePollManage poll = OnlinePollManage.builder()
                .pollId("POLL_001")
                .pollNm("테스트 온라인 설문")
                .pollBeginDe("2024-01-01")
                .pollEndDe("2024-12-31")
                .frstRegisterId("SYSTEM")
                .build();

        // When
        onlinePollManageRepository.save(poll);
        Optional<OnlinePollManage> found = onlinePollManageRepository.findById("POLL_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getPollNm()).isEqualTo("테스트 온라인 설문");
    }

    @Test
    @DisplayName("질문지 정보 저장 및 조회")
    void qestnrInfoTest() {
        // Given
        QestnrInfo qest = QestnrInfo.builder()
                .qestnrId("Q_001")
                .qestnrSj("테스트 질문지 주제")
                .qestnrPurps("테스트 목적")
                .build();

        // When
        qestnrInfoRepository.save(qest);
        Optional<QestnrInfo> found = qestnrInfoRepository.findById("Q_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getQestnrSj()).isEqualTo("테스트 질문지 주제");
    }
}
