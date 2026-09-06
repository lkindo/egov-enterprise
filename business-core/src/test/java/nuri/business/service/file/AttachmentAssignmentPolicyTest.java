package nuri.business.service.file;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 새 업무 참조가 첨부를 할당할 때 거치는 공용 인가 경계 검증.
 *
 * <p>파일 열람 권한(owner/shared/admin)과 재할당 권한은 별개다. 공용 경계는 첨부의 존재를 먼저
 * 확인하고, 원 업로더(loginId)만 새 참조를 만들 수 있게 {@link FileAccessPolicy}의 엄격 판정을
 * 사용한다. null detach와 동일 SN 유지 여부는 현재 엔티티를 아는 호출 서비스의 책임이다.
 */
@DisplayName("AttachmentAssignmentPolicy — 첨부 할당 인가")
class AttachmentAssignmentPolicyTest {

    private static final Long ATCH_FILE_SN = 101L;
    private static final String UPLOADER_LOGIN_ID = "original-uploader";
    private static final String OTHER_LOGIN_ID = "different-user";
    private static final String OTHER_ESNTL_ID = "USR_0000000000000002";

    private FileMasterRepository fileMasterRepository;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        fileMasterRepository = mock(FileMasterRepository.class);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("원 업로더는 존재하는 첨부를 새 업무 참조에 할당할 수 있다")
    void uploaderCanAssignExistingAttachment() {
        authenticate(UPLOADER_LOGIN_ID, "USR_0000000000000001", "ROLE_USER");
        givenExistingMaster(UPLOADER_LOGIN_ID);

        assertThatCode(() -> policy(AttachmentReferenceResolver.Grants.none())
                .assertAssignable(ATCH_FILE_SN))
                .doesNotThrowAnyException();

        verify(fileMasterRepository).findById(ATCH_FILE_SN);
    }

    @Test
    @DisplayName("존재하지 않는 첨부는 RESOURCE_NOT_FOUND로 거부한다")
    void missingAttachmentIsRejected() {
        authenticate(UPLOADER_LOGIN_ID, "USR_0000000000000001", "ROLE_USER");
        when(fileMasterRepository.findById(ATCH_FILE_SN)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> policy(AttachmentReferenceResolver.Grants.none())
                .assertAssignable(ATCH_FILE_SN))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("기존 참조의 소유자라도 원 업로더가 아니면 할당할 수 없다")
    void referenceOwnerCannotAssignForeignAttachment() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
        givenExistingMaster(UPLOADER_LOGIN_ID);

        assertAccessDenied(new AttachmentReferenceResolver.Grants(false, true, true, true, false));
    }

    @Test
    @DisplayName("공유 첨부를 읽을 수 있어도 원 업로더가 아니면 할당할 수 없다")
    void sharedReaderCannotAssignForeignAttachment() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
        givenExistingMaster(UPLOADER_LOGIN_ID);

        assertAccessDenied(new AttachmentReferenceResolver.Grants(true, false, false, false, false));
    }

    @Test
    @DisplayName("관리자도 타인의 첨부를 새 업무 참조에 할당할 수 없다")
    void adminCannotAssignForeignAttachment() {
        authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");
        givenExistingMaster(UPLOADER_LOGIN_ID);

        assertAccessDenied(AttachmentReferenceResolver.Grants.none());
    }

    @Test
    @DisplayName("미인증 주체는 첨부 할당을 할 수 없다")
    void unauthenticatedPrincipalCannotAssignAttachment() {
        givenExistingMaster(UPLOADER_LOGIN_ID);

        assertAccessDenied(AttachmentReferenceResolver.Grants.none());
    }

    @Test
    @DisplayName("null detach는 호출부 책임이므로 null 할당 검증 호출을 즉시 거부한다")
    void nullAttachmentIdIsCallerContractViolation() {
        assertThatThrownBy(() -> policy(AttachmentReferenceResolver.Grants.none())
                .assertAssignable(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("atchFileSn 은 null 일 수 없습니다");

        verify(fileMasterRepository, never()).findById(null);
    }

    @Test
    @DisplayName("할당 거부 로그에는 현재 loginId 원문을 남기지 않는다")
    void deniedAssignmentLogDoesNotContainRawLoginId() {
        String sensitiveLoginId = "private-login-id-sentinel";
        authenticate(sensitiveLoginId, OTHER_ESNTL_ID, "ROLE_USER");
        givenExistingMaster(UPLOADER_LOGIN_ID);
        Logger logger = (Logger) LoggerFactory.getLogger(FileAccessPolicy.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            assertAccessDenied(AttachmentReferenceResolver.Grants.none());

            assertThat(appender.list)
                    .extracting(ILoggingEvent::getFormattedMessage)
                    .anyMatch(message -> message.contains("첨부 연결 거부"))
                    .noneMatch(message -> message.contains(sensitiveLoginId));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private AttachmentAssignmentPolicy policy(AttachmentReferenceResolver.Grants grants) {
        AttachmentReferenceResolver referenceResolver = (atchFileSn, loginId, esntlId) -> grants;
        return new AttachmentAssignmentPolicy(
                fileMasterRepository,
                new FileAccessPolicy(referenceResolver));
    }

    private void givenExistingMaster(String uploaderLoginId) {
        when(fileMasterRepository.findById(ATCH_FILE_SN))
                .thenReturn(Optional.of(masterOwnedBy(uploaderLoginId)));
    }

    private void assertAccessDenied(AttachmentReferenceResolver.Grants grants) {
        assertThatThrownBy(() -> policy(grants).assertAssignable(ATCH_FILE_SN))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    private FileMaster masterOwnedBy(String loginId) {
        FileMaster master = new FileMaster(ATCH_FILE_SN);
        master.setFrstRgtrId(loginId);
        return master;
    }

    private void authenticate(String loginId, String esntlId, String role) {
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(loginId)
                .esntlId(esntlId)
                .userNm("tester")
                .password("N/A")
                .authorityCodes(List.of(role))
                .build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }
}
