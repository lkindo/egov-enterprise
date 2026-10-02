package nuri.business.service.survey;

import nuri.business.domain.survey.*;
import nuri.business.service.survey.dto.SurveyArticleDto;
import nuri.business.service.survey.dto.SurveyQuestionDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SurveyEditingConcurrencyTest {
    @Mock private SurveyTemplateRepository tmplatRepository;
    @Mock private SurveyInfoRepository infoRepository;
    @Mock private SurveyQuestionRepository qesitmRepository;
    @Mock private SurveyArticleRepository iemRepository;
    @Mock private SurveyResultRepository rsltRepository;
    @Mock private SurveyRespondentRepository rspdntRepository;
    @InjectMocks private SurveyService service;

    @Test
    void questionEditorChecksResponsesCommittedWhileItWasWaitingForSurveyLock() {
        SurveyQuestion question = SurveyQuestion.builder().srvyQstnSn(301L).srvySn(201L)
                .qstnSn(1L).qstnCn("원래 문항").maxChcCnt(1).build();
        var responses = new AtomicLong();
        given(infoRepository.findSurveyIdByQuestionId(301L)).willReturn(Optional.of(201L));
        given(qesitmRepository.findById(301L)).willReturn(Optional.of(question));
        given(rsltRepository.countBySrvyQstnSn(301L)).willAnswer(invocation -> responses.get());
        given(infoRepository.findByIdForSubmission(201L)).willAnswer(invocation -> {
            // 선행 제출이 응답을 커밋한 뒤 잠금이 넘어온다.
            responses.set(2L);
            return Optional.of(SurveyInfo.builder().srvySn(201L).build());
        });

        assertThatThrownBy(() -> service.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(301L)
                .qstnSn(1L).qstnCn("바꾼 문항").maxChcCnt(1).build()))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE));
        assertThat(question.getQstnCn()).isEqualTo("원래 문항");
    }

    @Test
    void itemEditorLoadsCommittedMeaningAfterSurveyLockInsteadOfComparingStaleEntity() {
        SurveyArticle before = SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L)
                .srvyQstnSn(301L).artclCn("이전 선택").build();
        SurveyArticle committed = SurveyArticle.builder().srvyArtclSn(401L).srvySn(201L)
                .srvyQstnSn(301L).artclCn("응답받은 선택").build();
        var currentItem = new AtomicReference<>(before);
        var responses = new AtomicLong();
        given(infoRepository.findSurveyIdByArticleId(401L)).willReturn(Optional.of(201L));
        given(iemRepository.findById(401L)).willAnswer(invocation -> Optional.of(currentItem.get()));
        given(rsltRepository.countBySrvyQstnSn(301L)).willAnswer(invocation -> responses.get());
        given(infoRepository.findByIdForSubmission(201L)).willAnswer(invocation -> {
            currentItem.set(committed);
            responses.set(2L);
            return Optional.of(SurveyInfo.builder().srvySn(201L).build());
        });

        assertThatThrownBy(() -> service.updateItem(SurveyArticleDto.builder().srvyArtclSn(401L)
                .artclSn(2L).artclCn("이전 선택").etcAnsYn("N").build()))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE));
        assertThat(committed.getArtclCn()).isEqualTo("응답받은 선택");
    }

    @Test
    void questionRemovedWhileEditorWasWaitingReturnsNotFoundWithoutChangingAnything() {
        given(infoRepository.findSurveyIdByQuestionId(301L)).willReturn(Optional.of(201L));
        given(infoRepository.findByIdForSubmission(201L)).willReturn(
                Optional.of(SurveyInfo.builder().srvySn(201L).build()));
        given(qesitmRepository.findById(301L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(301L).build()))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND));
        verify(rsltRepository, never()).countBySrvyQstnSn(301L);
    }
}
