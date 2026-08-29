package nuri.business.service.file;

import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.service.file.dto.AttachmentIntegrityReport;
import nuri.foundation.core.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * 첨부 정합성 점검.
 *
 * <p>[무엇을 지키는가 — 2026-08-26]
 * DB 와 파일 저장소를 분리 운영하는 것은 정상이고, 어긋나는 일도 정상 운영에서 생긴다(저장소 경로
 * 변경, 다른 환경 DB 연결, 백업 복원 시점 불일치). 문제는 <b>어긋났을 때 알 방법이 없었다</b>는
 * 점이다 — 실제로 사용자가 화면의 깨진 배너로 발견했다.
 *
 * <p>그래서 이 점검이 고정하는 것은 세 가지다: 어긋난 건수를 <b>정확히 세는가</b>, 저장 파일명이
 * 비어 있는 병든 레코드도 <b>놓치지 않는가</b>, 그리고 점검이 <b>레코드를 건드리지 않는가</b>.
 */
@DisplayName("첨부 정합성 점검")
class AttachmentIntegrityServiceTest {

    @Mock
    private FileDetailRepository fileDetailRepository;
    @Mock
    private FileStorageService fileStorageService;

    private AttachmentIntegrityService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new AttachmentIntegrityService(fileDetailRepository, fileStorageService);
    }

    private static FileDetail detail(long masterSn, int seq, String path, String storedName) {
        // 엔티티는 의미 있는 생성 메서드에만 빌더를 열어 두었다 — 그 계약을 그대로 쓴다.
        FileMaster master = FileMaster.builder().atchFileSn(masterSn).useYn("Y").build();
        return FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(seq)
                .fileStrgPath(path)
                .strgFileNm(storedName)
                .build();
    }

    private void givenRecords(List<FileDetail> records) {
        Page<FileDetail> page = new PageImpl<>(records, PageRequest.of(0, 500), records.size());
        when(fileDetailRepository.findAll(any(Pageable.class))).thenReturn(page);
    }

    @Test
    @DisplayName("실물이 모두 있으면 건강한 상태로 보고한다")
    void reportsHealthyWhenAllPresent() {
        givenRecords(List.of(detail(1L, 1, "general/A", "a.png"), detail(2L, 1, "general/B", "b.png")));
        when(fileStorageService.exists(any(), any())).thenReturn(true);

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.checked()).isEqualTo(2);
        assertThat(report.missing()).isZero();
        assertThat(report.isHealthy()).isTrue();
        assertThat(report.samples()).isEmpty();
    }

    @Test
    @DisplayName("실물이 없는 레코드를 세고 조치 대상을 지목한다")
    void countsAndNamesMissingObjects() {
        givenRecords(List.of(
                detail(1L, 1, "general/A", "a.png"),
                detail(2L, 1, "general/B", "b.png")));
        when(fileStorageService.exists(eq("a.png"), eq("general/A"))).thenReturn(true);
        when(fileStorageService.exists(eq("b.png"), eq("general/B"))).thenReturn(false);

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.checked()).isEqualTo(2);
        assertThat(report.missing()).isEqualTo(1);
        assertThat(report.isHealthy()).isFalse();
        // 조치하려면 어느 레코드인지 특정할 수 있어야 한다.
        assertThat(report.samples()).singleElement().asString()
                .contains("atchFileSn=2").contains("general/B/b.png");
    }

    @Test
    @DisplayName("저장 파일명이 비어 있는 레코드도 어긋남으로 센다")
    void treatsBlankStoredNameAsMissing() {
        // 저장 파일명이 없으면 실물을 찾을 길이 없다 — 정상으로 세면 병든 레코드가 조용히 통과한다.
        givenRecords(List.of(detail(3L, 1, "general/C", null), detail(4L, 1, "general/D", "  ")));

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.missing()).isEqualTo(2);
    }

    @Test
    @DisplayName("점검은 읽기만 한다 — 어긋난 레코드를 지우지 않는다")
    void neverMutatesRecords() {
        /*
         * 실물이 없는 이유가 "유실" 일 수도 "저장소 설정이 잠깐 틀렸다" 일 수도 있다.
         * 후자에서 레코드를 지우면 복구 가능한 상황을 복구 불가능하게 만든다.
         */
        givenRecords(List.of(detail(5L, 1, "general/E", "e.png")));
        when(fileStorageService.exists(any(), any())).thenReturn(false);

        service.scan();

        org.mockito.Mockito.verify(fileDetailRepository, org.mockito.Mockito.never())
                .delete(any(FileDetail.class));
        org.mockito.Mockito.verify(fileDetailRepository, org.mockito.Mockito.never())
                .deleteAll();
    }

    // ───────────────────────── 역방향(고아) census ─────────────────────────
    //
    // [무엇을 지키는가 — 2026-08-29] 종전에는 한 방향만 봤다. 저장소에는 있는데 DB 레코드가
    // 없는 파일은 디스크만 먹으며 아무에게도 보이지 않았다.
    //
    // ⚠ 이 방향의 결과는 사람이 **파일을 지우는** 근거가 된다. 그래서 정방향보다 엄격하다 —
    //   모르는 것을 고아라고 부르지 않고, 상한에 걸려도 조용히 자르지 않는다.

    /** 저장소 열거를 흉내 낸다. 호출마다 새 스트림을 준다 — 스트림은 한 번만 소비된다. */
    private void givenStorage(java.util.Map<String, List<String>> tree) {
        when(fileStorageService.load(eq(""))).thenReturn(java.nio.file.Path.of("/srv/uploads"));
        when(fileStorageService.loadAll(any())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            List<String> entries = tree.get(path);
            if (entries == null) {
                // 실제 구현은 없는 경로에서 예외를 던진다.
                throw new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.INTERNAL_SERVER_ERROR);
            }
            return entries.stream().map(java.nio.file.Path::of);
        });
    }

    private static nuri.business.service.file.dto.StoredFileKey key(long sn, String path, String name) {
        return new nuri.business.service.file.dto.StoredFileKey(sn, path, name);
    }

    @Test
    @DisplayName("DB 가 아는 실물만 있으면 고아 후보가 없다")
    void noOrphansWhenEveryStoredFileIsKnown() {
        givenRecords(List.of());
        givenStorage(java.util.Map.of(
                "general", List.of("1"),
                "general/1", List.of("a.png", "b.png")));
        when(fileDetailRepository.findStoredKeysByAtchFileSnIn(any()))
                .thenReturn(List.of(key(1L, "general/1", "a.png"), key(1L, "general/1", "b.png")));

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.storedFilesChecked()).isEqualTo(2);
        assertThat(report.orphanCandidates()).isZero();
        assertThat(report.undecidable()).isZero();
        // 어느 트리를 본 결과인지 없으면 보고서를 해석할 수 없다 — 설정 기본값이 상대 경로다.
        // 구분자는 플랫폼마다 다르므로 Path 로 정규화해 비교한다(CI 는 리눅스, 개발은 Windows).
        assertThat(report.storageRoot()).isEqualTo(java.nio.file.Path.of("/srv/uploads").toString());
    }

    @Test
    @DisplayName("DB 레코드가 없는 실물을 후보로 세고 위치를 지목한다")
    void countsStoredFilesWithoutRecords() {
        givenRecords(List.of());
        givenStorage(java.util.Map.of(
                "general", List.of("1"),
                "general/1", List.of("a.png", "ghost.png")));
        when(fileDetailRepository.findStoredKeysByAtchFileSnIn(any()))
                .thenReturn(List.of(key(1L, "general/1", "a.png")));

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.storedFilesChecked()).isEqualTo(2);
        assertThat(report.orphanCandidates()).isEqualTo(1);
        assertThat(report.orphanSamples()).anySatisfy(sample ->
                assertThat(sample).contains("general/1/ghost.png"));
        // 후보는 건강 판정에 넣지 않는다 — 커밋 전 업로드가 같은 모습이라 정상 운영에도 나온다.
        assertThat(report.isHealthy()).isTrue();
    }

    /**
     * V2_72 가 마스터 PK 를 문자열 {@code atch_file_id} 에서 BIGINT 로 바꾸면서
     * {@code file_strg_path} 는 갱신하지 않았다. 그래서 그 이전에 저장된 첨부의 디렉터리
     * 이름은 현재 번호와 무관하다 — <b>고아로 세면 멀쩡한 파일을 지우게 된다</b>.
     */
    @Test
    @DisplayName("구 키 형식 디렉터리는 고아가 아니라 판정 불가로 센다")
    void legacyKeyDirectoriesAreUndecidableNotOrphans() {
        givenRecords(List.of());
        givenStorage(java.util.Map.of(
                "general", List.of("FILE_000000000001"),
                "general/FILE_000000000001", List.of("legacy.png")));

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.orphanCandidates()).isZero();
        assertThat(report.undecidable()).isEqualTo(1);
        assertThat(report.orphanSamples()).anySatisfy(sample ->
                assertThat(sample).contains("판정 불가").contains("FILE_000000000001"));
        // 판정 불가 디렉터리는 파일까지 훑지 않는다 — 셀 수 없는 것을 센 척하지 않는다.
        assertThat(report.storedFilesChecked()).isZero();
    }

    /**
     * 조회 키가 {@code atchFileSn} 이라 경로가 다른 행이 섞여 들어올 수 있다.
     * 그 행을 그대로 믿으면 <b>다른 디렉터리의 파일</b>이 정상으로 보인다.
     */
    @Test
    @DisplayName("경로가 어긋난 DB 행은 그 디렉터리의 근거로 쓰지 않는다")
    void ignoresRowsWhosePathDoesNotMatchTheDirectory() {
        givenRecords(List.of());
        givenStorage(java.util.Map.of(
                "general", List.of("1"),
                "general/1", List.of("a.png")));
        // 같은 sn 이지만 경로는 구 키 시절 것이다 — general/1 의 a.png 를 설명하지 못한다.
        when(fileDetailRepository.findStoredKeysByAtchFileSnIn(any()))
                .thenReturn(List.of(key(1L, "general/FILE_0001", "a.png")));

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.orphanCandidates()).isEqualTo(1);
    }

    @Test
    @DisplayName("빈 디렉터리는 정상이다 — 삭제가 파일만 지우고 디렉터리는 남긴다")
    void emptyDirectoriesAreNormal() {
        givenRecords(List.of());
        givenStorage(java.util.Map.of(
                "general", List.of("1"),
                "general/1", List.of()));
        when(fileDetailRepository.findStoredKeysByAtchFileSnIn(any())).thenReturn(List.of());

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.orphanCandidates()).isZero();
        assertThat(report.undecidable()).isZero();
    }

    @Test
    @DisplayName("저장소를 열거하지 못하면 0 건이라 말하지 않고 모른다고 남긴다")
    void enumerationFailureIsReportedNotSilenced() {
        givenRecords(List.of());
        when(fileStorageService.load(eq(""))).thenReturn(java.nio.file.Path.of("/srv/uploads"));
        when(fileStorageService.loadAll(any())).thenThrow(
                new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.INTERNAL_SERVER_ERROR));

        AttachmentIntegrityReport report = service.scan();

        assertThat(report.orphanCandidates()).isZero();
        assertThat(report.undecidable()).isEqualTo(1);
        assertThat(report.orphanSamples()).anySatisfy(sample ->
                assertThat(sample).contains("열거 불가"));
    }

    @Test
    @DisplayName("열거 스트림을 닫는다 — 닫지 않으면 디렉터리 핸들이 고갈된다")
    void closesEnumerationStreams() {
        givenRecords(List.of());
        java.util.concurrent.atomic.AtomicInteger closed = new java.util.concurrent.atomic.AtomicInteger();
        when(fileStorageService.load(eq(""))).thenReturn(java.nio.file.Path.of("/srv/uploads"));
        when(fileStorageService.loadAll(any())).thenAnswer(invocation -> {
            String path = invocation.getArgument(0);
            List<String> entries = "general".equals(path) ? List.of("1") : List.of("a.png");
            return entries.stream().map(java.nio.file.Path::of).onClose(closed::incrementAndGet);
        });
        when(fileDetailRepository.findStoredKeysByAtchFileSnIn(any())).thenReturn(List.of());

        service.scan();

        // general 1회 + general/1 1회.
        assertThat(closed.get()).isEqualTo(2);
    }

    @Test
    @DisplayName("역방향 census 도 읽기만 한다 — 실물을 지우지 않는다")
    void orphanCensusNeverDeletesStoredFiles() {
        givenRecords(List.of());
        givenStorage(java.util.Map.of(
                "general", List.of("1"),
                "general/1", List.of("ghost.png")));
        when(fileDetailRepository.findStoredKeysByAtchFileSnIn(any())).thenReturn(List.of());

        service.scan();

        // 후보는 커밋 전 업로드일 수 있다. 자동 삭제는 복구 불가능한 손실을 만든다.
        org.mockito.Mockito.verify(fileStorageService, org.mockito.Mockito.never())
                .delete(any(), any());
        org.mockito.Mockito.verify(fileStorageService, org.mockito.Mockito.never())
                .delete(any());
    }
}
