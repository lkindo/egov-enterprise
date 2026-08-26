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
}
