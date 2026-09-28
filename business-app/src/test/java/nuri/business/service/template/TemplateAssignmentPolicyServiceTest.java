package nuri.business.service.template;

import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TemplateAssignmentPolicyServiceTest {
    @Test void onlyExistingActiveTemplateCanBeNewlyAssigned() {
        var repository = mock(TemplateRepository.class);
        var policy = new TemplateAssignmentPolicyService(repository);
        when(repository.findByIdForUpdate("missing")).thenReturn(Optional.empty());
        when(repository.findByIdForUpdate("inactive")).thenReturn(Optional.of(Template.builder().tmpltId("inactive").useYn("N").build()));
        when(repository.findByIdForUpdate("active")).thenReturn(Optional.of(Template.builder().tmpltId("active").useYn("Y").build()));
        for (String id : java.util.List.of("missing", "inactive")) {
            assertThatThrownBy(() -> policy.assertActiveForAssignment(id)).isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        policy.assertActiveForAssignment("active");
        verify(repository, never()).findById(anyString());
    }
}
