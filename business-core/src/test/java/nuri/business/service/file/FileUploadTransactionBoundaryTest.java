package nuri.business.service.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.foundation.core.job.DurableWorkPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class FileUploadTransactionBoundaryTest {

    @TempDir Path directory;
    private final FileMasterRepository masters = mock(FileMasterRepository.class);
    private final FileDetailRepository details = mock(FileDetailRepository.class);
    private final FileAccessPolicy policy = mock(FileAccessPolicy.class);
    private final DurableWorkPort work = mock(DurableWorkPort.class);
    private final ObjectMapper mapper = JsonMapper.builder().build();
    private final RecordingTransactionManager txManager = new RecordingTransactionManager();

    private LocalFileStorageService storage;
    private FileService fileService;
    private FileMaster master;

    @BeforeEach
    void setUp() {
        storage = spy(new LocalFileStorageService(directory.toString()));
        fileService = new FileService(masters, details, storage, policy, work, mapper, txManager);
        master = new FileMaster(123L);
        given(masters.save(any(FileMaster.class))).willReturn(master);
        given(masters.findByIdForUpdate(123L)).willReturn(Optional.of(master));
    }

    @Test
    void standaloneUploadRunsStorageIoOutsideTransactionsAndPersistsDetailsInShortTransaction() throws Exception {
        List<Boolean> txStatesDuringStore = new ArrayList<>();
        List<String> storedNames = new ArrayList<>();
        doAnswer(inv -> {
            txStatesDuringStore.add(TransactionSynchronizationManager.isActualTransactionActive());
            String name = (String) inv.callRealMethod();
            storedNames.add(name);
            return name;
        }).when(storage).store(any(), anyString());

        Long atchFileSn = fileService.uploadFiles(List.of(validJpeg("photo1.jpg"), validJpeg("photo2.jpg")));

        assertThat(atchFileSn).isEqualTo(123L);
        assertThat(txStatesDuringStore).containsExactly(false, false);
        assertThat(txManager.readOnlyFlags).containsExactly(false, false);
        assertThat(txManager.commits).isEqualTo(2);
        assertThat(txManager.rollbacks).isZero();
        for (String name : storedNames) {
            assertThat(directory.resolve("general/123").resolve(name)).exists();
        }
        var captor = org.mockito.ArgumentCaptor.forClass(FileDetail.class);
        verify(details, org.mockito.Mockito.times(2)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(FileDetail::getAtchFileSeq).containsExactly(1, 2);
    }

    @Test
    void standaloneUploadCompensatesStoredFilesAndDeletesEmptyMasterWhenDetailSaveFails() {
        AtomicReference<String> storedName = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());
        doThrow(new IllegalStateException("detail insert failed")).when(details).save(any(FileDetail.class));
        given(details.findByFileMaster(master)).willReturn(List.of());

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(validJpeg("fail.jpg"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("detail insert failed");

        assertThat(directory.resolve("general/123").resolve(storedName.get())).doesNotExist();
        verify(masters).delete(master);
        assertThat(txManager.commits).isEqualTo(2);
        assertThat(txManager.rollbacks).isEqualTo(1);
    }

    @Test
    void standaloneDownloadLoadsStorageResourceOutsideReadOnlyTransaction() throws Exception {
        Path stored = directory.resolve("general/123/stored.jpg");
        Files.createDirectories(stored.getParent());
        Files.write(stored, new byte[] { 1, 2, 3 });

        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(1)
                .orgnlFileNm("download.jpg")
                .strgFileNm("stored.jpg")
                .fileStrgPath("general/123")
                .build();
        given(details.findByFileMasterAtchFileSnAndAtchFileSeq(123L, 1)).willReturn(Optional.of(detail));
        List<Boolean> txStatesDuringLoad = new ArrayList<>();
        doAnswer(inv -> {
            txStatesDuringLoad.add(TransactionSynchronizationManager.isActualTransactionActive());
            return inv.callRealMethod();
        }).when(storage).loadAsResource("stored.jpg", "general/123");

        Resource resource = fileService.getFileResource(123L, 1);

        assertThat(resource.getFilename()).isEqualTo("download.jpg");
        assertThat(resource.exists()).isTrue();
        try (java.io.InputStream in = resource.getInputStream()) {
            assertThat(in.readAllBytes()).containsExactly(1, 2, 3);
        }
        assertThat(txStatesDuringLoad).containsExactly(false);
        assertThat(txManager.readOnlyFlags).containsExactly(true);
        assertThat(txManager.commits).isEqualTo(1);
        var order = inOrder(policy, storage);
        order.verify(policy).assertReadable(master);
        order.verify(storage).loadAsResource("stored.jpg", "general/123");
    }

    @Test
    void uploadInsideOuterTransactionJoinsOuterTransactionAndCompensatesViaAfterRollback() throws Exception {
        AtomicReference<String> storedName = new AtomicReference<>();
        List<Boolean> txStatesDuringStore = new ArrayList<>();
        doAnswer(inv -> {
            txStatesDuringStore.add(TransactionSynchronizationManager.isActualTransactionActive());
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());

        new TransactionTemplate(txManager).executeWithoutResult(status -> {
            try {
                fileService.uploadBoardFiles(List.of(validJpeg("board.jpg")));
            } catch (Exception ex) {
                throw new IllegalStateException(ex);
            }
            assertThat(directory.resolve("general/123").resolve(storedName.get())).exists();
            status.setRollbackOnly();
        });

        assertThat(txStatesDuringStore).containsExactly(true);
        assertThat(txManager.commits).isZero();
        assertThat(txManager.rollbacks).isEqualTo(1);
        assertThat(directory.resolve("general/123").resolve(storedName.get())).doesNotExist();
        verify(masters, never()).delete(any());
    }

    @Test
    void standaloneUploadCompensatesAndThrowsNotFoundWhenMasterMissingInWritePhase() {
        AtomicReference<String> storedName = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());
        given(masters.findByIdForUpdate(123L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(validJpeg("missing-master.jpg"))))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);

        assertThat(directory.resolve("general/123").resolve(storedName.get())).doesNotExist();
        verify(details, never()).save(any());
        verify(masters, never()).delete(any());
    }

    @Test
    void standaloneUploadPreservesMasterWhenOtherDetailsExistOnFailure() {
        AtomicReference<String> storedName = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());
        doThrow(new IllegalStateException("detail insert failed")).when(details).save(any(FileDetail.class));
        given(details.findByFileMaster(master)).willReturn(List.of(FileDetail.builder().fileMaster(master).atchFileSeq(1).build()));

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(validJpeg("nonempty.jpg"))))
                .isInstanceOf(IllegalStateException.class);

        assertThat(directory.resolve("general/123").resolve(storedName.get())).doesNotExist();
        verify(masters, never()).delete(any());
    }

    @Test
    void standaloneUploadCompensatesEarlierFileAndDeletesEmptyMasterWhenLaterStoreFails() {
        AtomicReference<String> firstStored = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            firstStored.set(name);
            return name;
        }).doThrow(new IllegalStateException("storage write failed")).when(storage).store(any(), anyString());
        given(details.findByFileMaster(master)).willReturn(List.of());

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(validJpeg("first.jpg"), validJpeg("second.jpg"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("storage write failed");

        assertThat(directory.resolve("general/123").resolve(firstStored.get())).doesNotExist();
        verify(masters).delete(master);
        assertThat(txManager.commits).isEqualTo(2);
        assertThat(txManager.rollbacks).isZero();
    }

    @Test
    void standaloneDownloadReturnsRawResourceWhenOriginalFilenameIsBlank() throws Exception {
        Path stored = directory.resolve("general/123/stored-blank.jpg");
        Files.createDirectories(stored.getParent());
        Files.write(stored, new byte[] { 4, 5, 6 });

        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(2)
                .orgnlFileNm(" ")
                .strgFileNm("stored-blank.jpg")
                .fileStrgPath("general/123")
                .build();
        given(details.findByFileMasterAtchFileSnAndAtchFileSeq(123L, 2)).willReturn(Optional.of(detail));

        Resource resource = fileService.getFileResource(123L, 2);

        assertThat(resource.getFilename()).isEqualTo("stored-blank.jpg");
    }

    @Test
    void standaloneUploadPreservesStoredFilesWhenPhase3CommitResultIsIndeterminate() {
        AtomicReference<String> storedName = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());
        txManager.failOnCommitCall = 2;

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(validJpeg("indeterminate.jpg"))))
                .isInstanceOf(org.springframework.transaction.TransactionSystemException.class);

        assertThat(directory.resolve("general/123").resolve(storedName.get())).exists();
        verify(masters, never()).delete(any());
        assertThat(txManager.commits).isEqualTo(1);
        assertThat(txManager.rollbacks).isZero();
    }

    @Test
    void standaloneUploadCompensatesStoredFilesAndDeletesMasterWhenPhase3BeginFails() {
        AtomicReference<String> storedName = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());
        given(details.findByFileMaster(master)).willReturn(List.of());
        txManager.failOnBeginCall = 2;

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(validJpeg("begin-fail.jpg"))))
                .isInstanceOf(org.springframework.transaction.CannotCreateTransactionException.class);

        assertThat(directory.resolve("general/123").resolve(storedName.get())).doesNotExist();
        verify(masters).delete(master);
        assertThat(txManager.commits).isEqualTo(2);
    }

    @Test
    void standaloneUploadAttachesSuppressedExceptionWhenEmptyMasterCleanupFails() {
        AtomicReference<String> storedName = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());
        doThrow(new IllegalStateException("detail insert failed")).when(details).save(any(FileDetail.class));
        given(details.findByFileMaster(master)).willReturn(List.of());
        doThrow(new IllegalStateException("cleanup failed")).when(masters).delete(master);

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(validJpeg("cleanup-fail.jpg"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("detail insert failed")
                .satisfies(ex -> assertThat(ex.getSuppressed())
                        .singleElement()
                        .isInstanceOf(IllegalStateException.class)
                        .satisfies(suppressed -> assertThat(suppressed.getMessage()).isEqualTo("cleanup failed")));

        assertThat(directory.resolve("general/123").resolve(storedName.get())).doesNotExist();
    }

    @Test
    void standaloneAppendRunsStorageIoOutsideTransactionsAndReverifiesAuthorizationUnderLock() throws Exception {
        given(masters.findById(123L)).willReturn(Optional.of(master));
        FileDetail existing = FileDetail.builder().fileMaster(master).atchFileSeq(4).build();
        given(details.findByFileMaster(master)).willReturn(List.of(existing));
        List<Boolean> txStatesDuringStore = new ArrayList<>();
        List<String> storedNames = new ArrayList<>();
        doAnswer(inv -> {
            txStatesDuringStore.add(TransactionSynchronizationManager.isActualTransactionActive());
            String name = (String) inv.callRealMethod();
            storedNames.add(name);
            return name;
        }).when(storage).store(any(), anyString());

        fileService.updateFiles(123L, List.of(validJpeg("append.jpg")));

        assertThat(txStatesDuringStore).containsExactly(false);
        assertThat(txManager.readOnlyFlags).containsExactly(true, false);
        assertThat(txManager.commits).isEqualTo(2);
        assertThat(txManager.rollbacks).isZero();
        var order = inOrder(masters, policy, storage, details);
        order.verify(masters).findById(123L);
        order.verify(policy).assertAppendable(master);
        order.verify(storage).store(any(), org.mockito.ArgumentMatchers.eq("general/123"));
        order.verify(masters).findByIdForUpdate(123L);
        order.verify(policy).assertAppendable(master);
        var captor = org.mockito.ArgumentCaptor.forClass(FileDetail.class);
        order.verify(details).save(captor.capture());
        assertThat(captor.getValue().getAtchFileSeq()).isEqualTo(5);
        assertThat(directory.resolve("general/123").resolve(storedNames.getFirst())).exists();
    }

    @Test
    void standaloneAppendCompensatesStoredFileWithoutDeletingExistingMasterWhenPhase3AuthFails() {
        given(masters.findById(123L)).willReturn(Optional.of(master));
        AtomicReference<String> storedName = new AtomicReference<>();
        doAnswer(inv -> {
            String name = (String) inv.callRealMethod();
            storedName.set(name);
            return name;
        }).when(storage).store(any(), anyString());
        org.mockito.Mockito.doNothing()
                .doThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED))
                .when(policy).assertAppendable(master);

        assertThatThrownBy(() -> fileService.updateBoardFiles(123L, List.of(validJpeg("toctou.jpg"))))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);

        assertThat(directory.resolve("general/123").resolve(storedName.get())).doesNotExist();
        verify(masters, never()).delete(any());
        verify(details, never()).save(any());
        assertThat(txManager.commits).isEqualTo(1);
        assertThat(txManager.rollbacks).isEqualTo(1);
    }

    private static MockMultipartFile validJpeg(String name) {
        return new MockMultipartFile(
                "files",
                name,
                "image/jpeg",
                new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10 });
    }

    private static final class RecordingTransactionManager extends AbstractPlatformTransactionManager {
        private final List<Boolean> readOnlyFlags = new ArrayList<>();
        private int commits;
        private int rollbacks;
        private int beginCalls;
        private int commitCalls;
        private int failOnBeginCall;
        private int failOnCommitCall;

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            beginCalls++;
            if (beginCalls == failOnBeginCall) {
                throw new org.springframework.transaction.CannotCreateTransactionException("pool timeout");
            }
            readOnlyFlags.add(definition.isReadOnly());
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            commitCalls++;
            if (commitCalls == failOnCommitCall) {
                throw new org.springframework.transaction.TransactionSystemException("indeterminate commit failure");
            }
            commits++;
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            rollbacks++;
        }
    }
}
