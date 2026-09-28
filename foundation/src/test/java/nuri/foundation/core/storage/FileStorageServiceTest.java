package nuri.foundation.core.storage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

@DisplayName("FileStorageService 미지원 지연 삭제 경계")
class FileStorageServiceTest {
    @Test
    @DisplayName("미지원 provider는 경로를 객체 식별자로 가장하거나 파일을 읽지 않는다")
    void unsupportedProviderRejectsIdentityCaptureWithoutFallingBackToPath() {
        FileStorageService storage = mock(FileStorageService.class, CALLS_REAL_METHODS);

        assertThatThrownBy(() -> storage.captureDeletionIdentity("attachment-42.bin", "scoped-user"))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessage("This storage adapter does not support safe deferred deletion");

        verify(storage).captureDeletionIdentity("attachment-42.bin", "scoped-user");
        verifyNoMoreInteractions(storage);
    }

    @Test
    @DisplayName("미지원 provider는 캡처된 객체 삭제를 기존 경로 삭제로 대체하지 않는다")
    void unsupportedProviderCannotDeleteAReplacementThroughLegacyDelete() {
        FileStorageService storage = mock(FileStorageService.class, CALLS_REAL_METHODS);
        UUID intent = UUID.fromString("1428b7b2-d8cd-4d79-aa6a-1364277ad2c9");

        assertThatThrownBy(() -> storage.deleteCaptured(intent, "attachment-42.bin", "scoped-user", "opaque-object-reference"))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessage("This storage adapter does not support safe deferred deletion");

        verify(storage).deleteCaptured(intent, "attachment-42.bin", "scoped-user", "opaque-object-reference");
        verifyNoMoreInteractions(storage);
    }

    @Test
    @DisplayName("미지원 provider는 롤백 준비물 정리를 파일 삭제로 대체하거나 성공으로 숨기지 않는다")
    void unsupportedProviderRejectsPreparationReleaseWithoutDeletingFiles() {
        FileStorageService storage = mock(FileStorageService.class, CALLS_REAL_METHODS);

        assertThatThrownBy(() -> storage.releaseDeletionIdentity("opaque-object-reference"))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessage("This storage adapter does not support safe deferred deletion");

        verify(storage).releaseDeletionIdentity("opaque-object-reference");
        verifyNoMoreInteractions(storage);
    }
}
