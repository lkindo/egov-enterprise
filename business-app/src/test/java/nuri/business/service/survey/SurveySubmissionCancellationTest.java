package nuri.business.service.survey;

import nuri.business.domain.survey.*;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SurveySubmissionCancellationTest {
    @Mock private SurveyResultRepository resultRepository;
    @Mock private SurveyQuestionRepository questionRepository;
    @Mock private SurveyArticleRepository articleRepository;
    @Mock private SurveyInfoRepository infoRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private SurveyResultService service;

    private static SurveyResult row(long id, long question, long article) {
        var row = SurveyResult.builder().srvyRspnsSn(id).srvySn(10L).srvyTmpltSn(20L)
                .srvyQstnSn(question).srvyArtclSn(article).rspnsNm("동명이인").build();
        row.setFrstRgtrId("author-login");
        row.setCrtDt(LocalDateTime.of(2026, 9, 28, 10, 0));
        return row;
    }

    private void lockedSubmission(List<SurveyResult> rows) {
        when(resultRepository.findById(1L)).thenReturn(Optional.of(rows.getFirst()));
        when(infoRepository.findByIdForSubmission(10L)).thenReturn(Optional.of(SurveyInfo.builder()
                .srvySn(10L).srvyTmpltSn(20L).build()));
        var user = User.builder().esntlId("author-key").userId("author-login").build();
        user.setCrtDt(LocalDateTime.of(2026, 1, 1, 0, 0));
        when(userRepository.findByUserIdForUpdate("author-login")).thenReturn(Optional.of(user));
        when(resultRepository.findBySrvySnAndFrstRgtrId(10L, "author-login")).thenReturn(rows);
    }

    private void twoQuestionForm() {
        when(questionRepository.findBySrvySnOrderByQstnSnAsc(10L)).thenReturn(List.of(
                SurveyQuestion.builder().srvyQstnSn(30L).srvySn(10L).maxChcCnt(2).build(),
                SurveyQuestion.builder().srvyQstnSn(31L).srvySn(10L).maxChcCnt(1).build()));
        when(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(anyCollection())).thenReturn(List.of(
                SurveyArticle.builder().srvyArtclSn(40L).srvyQstnSn(30L).srvySn(10L).build(),
                SurveyArticle.builder().srvyArtclSn(41L).srvyQstnSn(30L).srvySn(10L).build(),
                SurveyArticle.builder().srvyArtclSn(42L).srvyQstnSn(31L).srvySn(10L).build()));
    }

    @Test
    void cancelsMultipleQuestionsAndSelectionsByAuditIdentityAfterSurveyLock() {
        var rows = List.of(row(1, 30, 40), row(2, 30, 41), row(3, 31, 42));
        lockedSubmission(rows);
        twoQuestionForm();
        try (var security = mockStatic(SecurityUtil.class)) {
            service.cancelSubmission(1L);
            security.verify(() -> SecurityUtil.assertPermission("SURVEY_RSP_DELETE"));
        }
        var order = inOrder(infoRepository, resultRepository);
        order.verify(resultRepository).findById(1L);
        order.verify(infoRepository).findByIdForSubmission(10L);
        order.verify(resultRepository).findBySrvySnAndFrstRgtrId(10L, "author-login");
        order.verify(resultRepository).deleteAll(rows);
        order.verify(resultRepository).flush();
        verify(resultRepository, never()).deleteById(anyLong());
    }

    @Test
    void rejectsMissingAuditAuthorWithoutGroupingByDisplayName() {
        var anchor = row(1, 30, 40);
        anchor.setFrstRgtrId(null);
        when(resultRepository.findById(1L)).thenReturn(Optional.of(anchor));
        when(infoRepository.findByIdForSubmission(10L)).thenReturn(Optional.of(SurveyInfo.builder().srvySn(10L).build()));
        try (var security = mockStatic(SecurityUtil.class)) {
            assertThatThrownBy(() -> service.cancelSubmission(1L)).isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        }
        verifyNoInteractions(userRepository);
        verify(resultRepository, never()).deleteAll(any());
    }

    @Test
    void rejectsPartialLegacySubmissionInsteadOfGuessingAMissingAnswer() {
        lockedSubmission(List.of(row(1, 30, 40)));
        twoQuestionForm();
        try (var security = mockStatic(SecurityUtil.class)) {
            assertThatThrownBy(() -> service.cancelSubmission(1L)).isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        }
        verify(resultRepository, never()).deleteAll(any());
    }

    @Test
    void concurrentCancellationMustNotCancelANewerSubmissionWithAnotherAnchor() {
        var anchor = row(1, 30, 40);
        lockedSubmission(List.of(anchor));
        when(resultRepository.findBySrvySnAndFrstRgtrId(10L, "author-login"))
                .thenReturn(List.of(row(4, 30, 40), row(5, 31, 42)));
        try (var security = mockStatic(SecurityUtil.class)) {
            assertThatThrownBy(() -> service.cancelSubmission(1L)).isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        verify(resultRepository, never()).deleteAll(any());
    }

    @Test
    void rejectsAnAuthorLoginReusedAfterTheAnswersWereCreated() {
        var rows = List.of(row(1, 30, 40), row(2, 31, 42));
        lockedSubmission(rows);
        var replacement = User.builder().esntlId("replacement-key").userId("author-login").build();
        replacement.setCrtDt(LocalDateTime.of(2026, 9, 29, 0, 0));
        when(userRepository.findByUserIdForUpdate("author-login")).thenReturn(Optional.of(replacement));
        try (var security = mockStatic(SecurityUtil.class)) {
            assertThatThrownBy(() -> service.cancelSubmission(1L)).isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        }
        verify(resultRepository, never()).deleteAll(any());
        verifyNoInteractions(questionRepository, articleRepository);
    }

    @Test
    void deniedCallerDoesNotReadOrDeleteResponses() {
        try (var security = mockStatic(SecurityUtil.class)) {
            security.when(() -> SecurityUtil.assertPermission("SURVEY_RSP_DELETE"))
                    .thenThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED));
            assertThatThrownBy(() -> service.cancelSubmission(1L)).isInstanceOf(BusinessException.class);
        }
        verifyNoInteractions(resultRepository, infoRepository, userRepository);
    }

    @Test
    void legacySingleAnswerDeleteCannotSilentlyBecomeWholeSubmissionCancellation() {
        assertThatThrownBy(() -> service.deleteResponse(1L)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        verifyNoInteractions(resultRepository, infoRepository, userRepository);
    }
}
