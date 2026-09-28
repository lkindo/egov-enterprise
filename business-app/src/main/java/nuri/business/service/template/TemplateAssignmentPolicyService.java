package nuri.business.service.template;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.template.TemplateRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.template.TemplateAssignmentPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TemplateAssignmentPolicyService implements TemplateAssignmentPolicy {
    private final TemplateRepository templateRepository;

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void assertActiveForAssignment(String templateId) {
        templateRepository.findByIdForUpdate(templateId).filter(template -> "Y".equals(template.getUseYn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "존재하는 사용 중 템플릿을 선택해 주세요."));
    }
}
