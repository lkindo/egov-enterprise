package nuri.business.service.file;

import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkPort;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** Actual temporary files and Spring transaction completion, with injected commit failure. */
class FileDeletionTransactionTest {
    @TempDir Path directory;
    private final FileMasterRepository masters = mock(FileMasterRepository.class);
    private final FileDetailRepository details = mock(FileDetailRepository.class);
    private final FileAccessPolicy policy = mock(FileAccessPolicy.class);
    private final DurableWorkPort work = mock(DurableWorkPort.class);
    private final ObjectMapper mapper = JsonMapper.builder().build();
    private final CommitFailureTransactionManager manager = new CommitFailureTransactionManager();
    private final TransactionTemplate transaction = new TransactionTemplate(manager);
    private FileService service;
    private LocalFileStorageService storage;
    private FileMaster master;
    private FileDetail detail;
    private Path file;

    @BeforeEach
    void setUp() throws IOException {
        storage = spy(new LocalFileStorageService(directory.toString()));
        master = new FileMaster(123L);
        detail = FileDetail.builder().fileMaster(master).atchFileSeq(1)
                .strgFileNm("retained.txt").fileStrgPath("general/123").build();
        ReflectionTestUtils.setField(detail, "id", java.util.UUID.randomUUID());
        file = directory.resolve("general/123/retained.txt");
        Files.createDirectories(file.getParent());
        Files.writeString(file, "preserve on rollback");
        when(details.findByFileMasterAtchFileSnAndAtchFileSeq(123L, 1)).thenReturn(Optional.of(detail));
        when(masters.findByIdForUpdate(123L)).thenReturn(Optional.of(master));
        service = new FileService(masters, details, storage, policy, work, mapper);
    }

    @Test
    void commitFailurePreservesThePhysicalFile() {
        manager.failCommit = true;
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> deleteOne()))
                .isInstanceOf(TransactionSystemException.class);
        assertThat(file).hasContent("preserve on rollback");
        verify(details).delete(detail);
    }

    @Test
    void outerRollbackPreservesThePhysicalFile() {
        transaction.executeWithoutResult(status -> {
            deleteOne();
            status.setRollbackOnly();
        });
        assertThat(file).hasContent("preserve on rollback");
    }

    @Test
    void successfulCommitPreservesFileUntilDurableIntentIsDelivered() {
        transaction.executeWithoutResult(status -> {
            deleteOne();
            assertThat(file).exists();
            verify(details).delete(detail);
        });
        assertThat(file).exists();
        ArgumentCaptor<DurableWork> captured = ArgumentCaptor.forClass(DurableWork.class);
        verify(work).enqueue(captured.capture());
        new FileDeletionWorkHandler(storage, details, mapper).execute(captured.getValue());
        assertThat(file).doesNotExist();
    }

    @Test
    void repositoryFailurePreservesThePhysicalFile() {
        doThrow(new IllegalStateException("injected database failure")).when(details).delete(detail);
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> deleteOne()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(file).hasContent("preserve on rollback");
    }

    @Test
    void intentPersistenceFailureRollsBackInsteadOfDroppingPhysicalDeletion() {
        doThrow(new IllegalStateException("injected intent persistence failure"))
                .when(work).enqueue(any());

        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> deleteOne()))
                .isInstanceOf(IllegalStateException.class);

        verify(details).delete(detail);
        assertThat(file).exists();
    }

    @Test
    void discardRemovesAnUnreferencedAttachmentAndSchedulesItsPhysicalDeletion() {
        when(masters.findByIdForUpdate(123L)).thenReturn(Optional.of(master));
        when(details.findByFileMaster(master)).thenReturn(java.util.List.of(detail));
        when(policy.referenced(123L)).thenReturn(false);

        Boolean discarded = transaction.execute(status -> service.discardUnreferencedAttachment(123L));

        assertThat(discarded).isTrue();
        verify(details).delete(detail);
        verify(masters).delete(master);
        verify(work).enqueue(any());
        assertThat(file).exists();
    }

    @Test
    void discardKeepsAnAttachmentThatAnotherFeatureStillReferences() {
        // 같은 업로더가 게시글 등 다른 업무에 함께 건 첨부는 지우지 않는다 — 참조 조회 실패도 참조로 본다(ADR-0042).
        when(masters.findByIdForUpdate(123L)).thenReturn(Optional.of(master));
        when(policy.referenced(123L)).thenReturn(true);

        Boolean discarded = transaction.execute(status -> service.discardUnreferencedAttachment(123L));

        assertThat(discarded).isFalse();
        verify(details, org.mockito.Mockito.never()).delete(any());
        verify(masters, org.mockito.Mockito.never()).delete(any());
        verify(work, org.mockito.Mockito.never()).enqueue(any());
    }

    private void deleteOne() {
        try {
            service.deleteFile(123L, 1);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static final class CommitFailureTransactionManager extends AbstractPlatformTransactionManager {
        private boolean failCommit;

        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object tx, TransactionDefinition definition) { }
        @Override protected void doCommit(DefaultTransactionStatus status) {
            if (failCommit) throw new TransactionSystemException("injected commit failure");
        }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
    }
}
