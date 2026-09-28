package nuri.business.service.board;

import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.service.board.template.BoardTemplateReferenceContributor;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BoardTemplateReferenceContributorTest {
    @Test void builtInLayoutsAreIndependentWhileUnknownLegacyReferencesRemainProtected() {
        var repository = mock(BoardMasterRepository.class);
        var contributor = new BoardTemplateReferenceContributor(repository);
        for (String layout : java.util.List.of("TMPLT_HUB", "TMPLT_LIST", "TMPLT_GALLERY", "TMPLT_QNA", "TMPLT_CALENDAR", "TMPLT_FAQ", "TMPLT_WIKI")) {
            assertThat(contributor.countReferences(layout)).isZero();
        }
        verifyNoInteractions(repository);
        when(repository.countByTmpltId("TMPLAT_BOARD_DEFAULT")).thenReturn(2L);
        assertThat(contributor.countReferences("TMPLAT_BOARD_DEFAULT")).isEqualTo(2);
    }
}
