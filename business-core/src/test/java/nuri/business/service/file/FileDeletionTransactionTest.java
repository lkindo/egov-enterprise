package nuri.business.service.file;

import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
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
import java.util.List;
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
        file = directory.resolve("general/123/retained.txt");
        Files.createDirectories(file.getParent());
        Files.writeString(file, "preserve on rollback");
        when(details.findByFileMasterAtchFileSnAndAtchFileSeq(123L, 1)).thenReturn(Optional.of(detail));
        service = new FileService(masters, details, storage, policy);
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
    void successfulCommitDeletesTheFileOnlyAfterDatabaseCompletion() {
        transaction.executeWithoutResult(status -> {
            deleteOne();
            assertThat(file).exists();
            verify(details).delete(detail);
        });
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
    void bulkRollbackAlsoPreservesAllPhysicalFiles() {
        when(masters.findById(123L)).thenReturn(Optional.of(master));
        when(details.findByFileMaster(master)).thenReturn(List.of(detail));
        transaction.executeWithoutResult(status -> {
            try {
                service.deleteFiles(123L);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
            status.setRollbackOnly();
        });
        assertThat(file).hasContent("preserve on rollback");
    }

    @Test
    void storageFailureAfterCommitLeavesAnOrphanButDoesNotStopOtherCleanup() throws IOException {
        Path otherFile = file.resolveSibling("other.txt");
        Files.writeString(otherFile, "other attachment");
        FileDetail other = FileDetail.builder().fileMaster(master).atchFileSeq(2)
                .strgFileNm("other.txt").fileStrgPath("general/123").build();
        when(masters.findById(123L)).thenReturn(Optional.of(master));
        when(details.findByFileMaster(master)).thenReturn(List.of(detail, other));
        doThrow(new IllegalStateException("injected storage failure"))
                .when(storage).delete("retained.txt", "general/123");

        transaction.executeWithoutResult(status -> {
            try {
                service.deleteFiles(123L);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        });

        verify(masters).delete(master);
        assertThat(file).exists();
        assertThat(otherFile).doesNotExist();
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
