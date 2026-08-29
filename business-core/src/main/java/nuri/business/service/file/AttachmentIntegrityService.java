package nuri.business.service.file;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.service.file.dto.AttachmentIntegrityReport;
import nuri.business.service.file.dto.StoredFileKey;
import nuri.foundation.core.storage.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

/**
 * 첨부 정합성 점검 — DB 레코드와 저장소 실물이 어긋났는지 센다.
 *
 * <p>[왜 필요한가 — 2026-08-26]
 * DB 와 파일 저장소를 분리 운영하는 것은 정상이다. 문제는 <b>어긋났을 때 그것을 알 방법이 없다</b>는
 * 점이었다 — 실제로 이번에는 사용자가 화면의 깨진 배너로 발견했다. 분리를 안전하게 만드는 것은
 * "어긋나지 않게" 가 아니라 <b>"어긋나면 드러나게"</b> 다.
 *
 * <p>드리프트는 정상 운영에서도 생긴다: 저장소 경로 설정 변경, 다른 환경의 DB 를 붙임, 백업 복원
 * 시점 불일치, 스토리지 마이그레이션 중단. 그래서 <b>사후 탐지 수단</b>이 있어야 한다.
 *
 * <p>[2026-08-29 역방향 추가] 종전에는 <b>한 방향만</b> 봤다 — DB 레코드가 가리키는 실물이 있는가.
 * 저장소에는 있는데 DB 레코드가 없는 파일은 디스크만 먹으며 아무에게도 보이지 않았다.
 * 이제 두 방향을 같은 보고서에 담는다.
 *
 * <p>⚠ 읽기 전용이다. 어긋난 레코드를 <b>자동으로 지우지 않는다</b> — 실물이 없는 이유가 "유실"일
 * 수도 "저장소 설정이 잠깐 틀렸다"일 수도 있는데, 후자에서 레코드를 지우면 복구 가능한 상황을
 * 복구 불가능하게 만든다. 판단은 사람이 한다. 역방향도 같다 — 오히려 더 엄격하다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttachmentIntegrityService {

    /**
     * 한 번에 확인할 레코드 수.
     *
     * <p>전량을 메모리에 올리지 않는다 — 첨부는 수만 건이 될 수 있고, 점검이 서비스 메모리를
     * 압박하면 점검 때문에 장애가 난다.
     */
    private static final int SCAN_PAGE_SIZE = 500;

    /** 저장 규약의 최상위 디렉터리. {@code FileService} 가 쓰는 유일한 targetPath 접두다. */
    private static final String GENERAL_ROOT = "general";

    /** 한 번에 대조할 디렉터리 수. DB 왕복을 묶되 IN 목록이 커지지 않게 한다. */
    private static final int DIRECTORY_CHUNK_SIZE = 500;

    /**
     * 역방향 스캔의 상한.
     *
     * <p>상한에 걸리면 <b>조용히 자르지 않는다</b> — 판정 불가로 세고 보고서에 남긴다.
     * 잘린 줄 모르고 "고아 N건" 을 읽으면 그 N 이 전체인 줄 알게 된다.
     */
    private static final int MAX_DIRECTORIES = 50_000;

    /** 보고에 담을 예시 최대 건수. 전체 규모는 개수로, 조치 대상은 예시로 본다. */
    private static final int SAMPLE_LIMIT = 50;

    private final FileDetailRepository fileDetailRepository;
    private final FileStorageService fileStorageService;

    /**
     * 양방향으로 훑는다.
     *
     * @return 점검 결과. 어긋난 건수와 조치 대상 예시를 담는다.
     */
    public AttachmentIntegrityReport scan() {
        long checked = 0;
        long missing = 0;
        List<String> samples = new ArrayList<>();

        int pageNumber = 0;
        Page<FileDetail> page;
        do {
            page = fileDetailRepository.findAll(PageRequest.of(pageNumber, SCAN_PAGE_SIZE));
            for (FileDetail detail : page.getContent()) {
                checked++;
                if (isMissing(detail)) {
                    missing++;
                    if (samples.size() < SAMPLE_LIMIT) {
                        samples.add(describe(detail));
                    }
                }
            }
            pageNumber++;
        } while (page.hasNext());

        if (missing > 0) {
            log.error(">>> STORAGE DRIFT: 첨부 {}건 중 {}건이 저장소에 실물이 없습니다."
                    + " 저장소 설정이 바뀌었거나 파일이 유실됐습니다.", checked, missing);
        } else {
            log.info(">>> 첨부 정합성 점검: {}건 모두 저장소에 실물이 있습니다.", checked);
        }

        OrphanCensus orphans = censusOrphans();

        return new AttachmentIntegrityReport(checked, missing, samples,
                orphans.storageRoot(), orphans.filesChecked(), orphans.candidates(),
                orphans.undecidable(), orphans.samples());
    }

    /** 역방향 census 의 중간 집계. 보고서로 바로 나가지 않고 여기서 모은다. */
    private record OrphanCensus(String storageRoot, long filesChecked, long candidates,
                                long undecidable, List<String> samples) {
    }

    /**
     * 저장소의 실물 중 대응하는 DB 레코드가 없는 것을 센다.
     *
     * <p><b>결과는 "고아" 가 아니라 "고아 후보" 다.</b> 업로드는 실물을 먼저 쓰고 트랜잭션이
     * 커밋돼야 행이 보인다 — 커밋 전 파일과 진짜 고아는 저장소에서 <b>완전히 같은 모습</b>이다.
     * 저장소에 "쓰는 중" 표식이 없고 포트에 시각 조회가 없으므로 이 창은 원리적으로 닫히지
     * 않는다. 그래서 확정하지 않고 후보로 보고하며, 자동으로 지우지 않는다.
     *
     * <p><b>판정 불가를 고아로 세지 않는다.</b> {@code general/} 아래 디렉터리 이름은 저장 당시의
     * 첨부 키인데, V2_72 가 마스터 PK 를 문자열 {@code atch_file_id} 에서 BIGINT
     * {@code atch_file_sn} 으로 바꾸면서 {@code file_strg_path} 는 갱신하지 않았다. 그래서
     * V2_72 이전에 저장된 첨부의 디렉터리 이름은 현재 번호와 무관하다. 숫자로 읽히지 않는
     * 디렉터리는 <b>모른다고 보고</b>한다 — 모르는 것을 고아라고 부르면 사람이 지운다.
     *
     * <p>빈 디렉터리는 정상이다. {@code FileService.deleteFiles} 는 파일만 지우고 디렉터리는
     * 남긴다. 그래서 판정 단위는 디렉터리가 아니라 <b>파일</b>이다.
     */
    private OrphanCensus censusOrphans() {
        String root = describeRoot();
        List<String> samples = new ArrayList<>();

        List<String> directories;
        try {
            directories = listNames(GENERAL_ROOT);
        } catch (RuntimeException enumerationFailure) {
            // 업로드 이력이 없어 general/ 이 아직 없을 수도, 저장소에 닿지 못할 수도 있다.
            // 포트가 둘을 구분해 주지 않으므로 0 건으로 단정하지 않고 모른다고 남긴다.
            log.warn(">>> 저장소 열거 실패 — 고아 census 를 수행하지 못했습니다. root={}", root);
            samples.add("열거 불가: " + GENERAL_ROOT + " (업로드 이력이 없거나 저장소에 접근할 수 없습니다)");
            return new OrphanCensus(root, 0, 0, 1, samples);
        }

        long undecidable = 0;
        if (directories.size() > MAX_DIRECTORIES) {
            long dropped = directories.size() - (long) MAX_DIRECTORIES;
            undecidable += dropped;
            samples.add("상한 초과로 훑지 않음: " + dropped + "개 디렉터리");
            directories = directories.subList(0, MAX_DIRECTORIES);
        }

        Map<String, Long> numeric = new LinkedHashMap<>();
        for (String name : directories) {
            try {
                numeric.put(name, Long.valueOf(name));
            } catch (NumberFormatException legacyOrForeign) {
                undecidable++;
                if (samples.size() < SAMPLE_LIMIT) {
                    samples.add("판정 불가(구 키 형식 디렉터리): " + GENERAL_ROOT + "/" + name);
                }
            }
        }

        long filesChecked = 0;
        long candidates = 0;
        List<String> names = new ArrayList<>(numeric.keySet());
        List<String> chunk = new ArrayList<>(DIRECTORY_CHUNK_SIZE);
        for (int index = 0; index < names.size(); index++) {
            chunk.add(names.get(index));
            boolean last = index == names.size() - 1;
            if (chunk.size() < DIRECTORY_CHUNK_SIZE && !last) {
                continue;
            }

            Map<String, Set<String>> known = knownNamesByDirectory(chunk, numeric);
            for (String directory : chunk) {
                Set<String> expected = known.getOrDefault(directory, Set.of());
                for (String file : listNames(GENERAL_ROOT + "/" + directory)) {
                    filesChecked++;
                    if (!expected.contains(file)) {
                        candidates++;
                        if (samples.size() < SAMPLE_LIMIT) {
                            samples.add("고아 후보: " + GENERAL_ROOT + "/" + directory + "/" + file);
                        }
                    }
                }
            }
            chunk.clear();
        }

        if (candidates > 0) {
            log.warn(">>> 저장소에 DB 레코드가 없는 실물 {}건(후보). 커밋 전 업로드일 수 있으니"
                    + " 시간을 두고 다시 점검한 뒤 판단하십시오. root={}", candidates, root);
        }
        return new OrphanCensus(root, filesChecked, candidates, undecidable, samples);
    }

    /**
     * 디렉터리 묶음의 DB 기록 위치를 한 번에 읽는다.
     *
     * <p>돌려받은 행의 {@code fileStrgPath} 가 <b>실제로 그 디렉터리인지</b> 다시 확인한다 —
     * 조회 키가 {@code atchFileSn} 이라, 경로가 다른 행(구 키 시절 경로)이 섞여 들어오면
     * 그 행 때문에 다른 디렉터리의 파일이 정상으로 보일 수 있다.
     */
    private Map<String, Set<String>> knownNamesByDirectory(List<String> directories,
                                                           Map<String, Long> numeric) {
        List<Long> sns = directories.stream().map(numeric::get).toList();
        Map<String, Set<String>> known = new LinkedHashMap<>();
        for (StoredFileKey key : fileDetailRepository.findStoredKeysByAtchFileSnIn(sns)) {
            if (key.strgFileNm() == null || key.fileStrgPath() == null) {
                continue;
            }
            String expectedPath = GENERAL_ROOT + "/" + key.atchFileSn();
            if (!expectedPath.equals(key.fileStrgPath())) {
                continue;
            }
            known.computeIfAbsent(String.valueOf(key.atchFileSn()), ignored -> new HashSet<>())
                    .add(key.strgFileNm());
        }
        return known;
    }

    /**
     * 이름 목록을 읽고 <b>즉시 스트림을 닫는다</b>.
     *
     * <p>{@code loadAll} 이 돌려주는 스트림은 {@code Files.walk} 백킹이라 열린 디렉터리 핸들을
     * 물고 있고 포트도 구현체도 닫아 주지 않는다. 닫지 않으면 디렉터리가 많은 저장소에서
     * 파일 디스크립터가 고갈된다.
     */
    private List<String> listNames(String path) {
        try (Stream<Path> entries = fileStorageService.loadAll(path)) {
            return entries.map(Path::toString).toList();
        }
    }

    /** 어느 트리를 본 결과인지 남긴다 — 설정 기본값이 상대 경로라 작업 디렉터리에 따라 달라진다. */
    private String describeRoot() {
        try {
            return fileStorageService.load("").toString();
        } catch (RuntimeException unavailable) {
            return "(확인 불가)";
        }
    }

    private boolean isMissing(FileDetail detail) {
        String storedName = detail.getStrgFileNm();
        if (storedName == null || storedName.isBlank()) {
            // 저장 파일명이 없으면 애초에 실물을 찾을 수 없다 — 드리프트로 센다.
            return true;
        }
        String path = detail.getFileStrgPath() == null ? "" : detail.getFileStrgPath();
        return !fileStorageService.exists(storedName, path);
    }

    /**
     * 조치 대상 식별자만 남긴다.
     *
     * <p>⚠ 원본 파일명은 넣지 않는다 — 사용자 입력이고, 진단 목적에는 저장 경로만으로 충분하다.
     */
    private String describe(FileDetail detail) {
        Long masterSn = detail.getFileMaster() == null ? null : detail.getFileMaster().getAtchFileSn();
        return "atchFileSn=" + masterSn
                + " seq=" + detail.getAtchFileSeq()
                + " path=" + detail.getFileStrgPath()
                + "/" + detail.getStrgFileNm();
    }
}
