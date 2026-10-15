package nuri.migration.archive;

import nuri.migration.archive.ArchiveFileWriter.PersonalShapes;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 한 load 실행의 보관 덤프·격리 키 반출 결과(ADR-0029 L3e). 검증({@code MigrationVerifier})과 실행 증거가 읽는다. 파일은
 * 디렉터리를 뺀 이름으로만 담고, 값·키·경로는 담지 않는다.
 *
 * @param writesFiles 보관 디렉터리에 파일을 썼는가(COMMIT). 거짓이면 dry-run 처럼 행 수만 셌다
 * @param dumps 끝까지 읽어 마친 보관 덤프
 * @param keyExports 격리한 행이 있는 표의 키 반출
 * @param errors 덤프·반출을 마치지 못한 이유(표 이름·고정 사유 코드)
 */
public record ArchiveOutcome(boolean writesFiles, List<Dumped> dumps, List<KeyExport> keyExports,
                             List<String> errors) {

    public ArchiveOutcome {
        dumps = dumps == null ? List.of() : List.copyOf(dumps);
        keyExports = keyExports == null ? List.of() : List.copyOf(keyExports);
        errors = errors == null ? List.of() : List.copyOf(errors);
    }

    /**
     * 마친 보관 덤프 하나. {@code sourceRows} 는 이 덤프를 채운 읽기에서 읽은 원천 행 수(매핑된 표는 그 표의 조회 수),
     * {@code rows} 는 덤프에 쓴(dry-run 은 셀) 행 수다 — 둘이 같아야 한다. {@code fileName}·{@code sha256} 은 dry-run 에서
     * 비어 있다. {@code personalShapes} 는 보관 컬럼마다(선언 순서), {@code keyPersonalShapes} 는 덤프 행마다 원값을 싣는
     * 정렬 키 컬럼마다 주민등록번호·전화번호·이메일 모양이 든 행 수다.
     */
    public record Dumped(String id, String source, boolean dumpOnly, long sourceRows, long rows, String fileName,
                         long bytes, String sha256, String retainUntil, List<String> ledgerEntries,
                         Map<String, PersonalShapes> personalShapes, Map<String, PersonalShapes> keyPersonalShapes) {

        public Dumped {
            ledgerEntries = ledgerEntries == null ? List.of() : List.copyOf(ledgerEntries);
            personalShapes = copy(personalShapes);
            keyPersonalShapes = copy(keyPersonalShapes);
        }

        /** 정렬 키 모양 수가 없는 결과(시험 보조). */
        public Dumped(String id, String source, boolean dumpOnly, long sourceRows, long rows, String fileName,
                      long bytes, String sha256, String retainUntil, List<String> ledgerEntries,
                      Map<String, PersonalShapes> personalShapes) {
            this(id, source, dumpOnly, sourceRows, rows, fileName, bytes, sha256, retainUntil, ledgerEntries,
                    personalShapes, Map.of());
        }
    }

    /**
     * 표 하나의 격리 키 반출 파일. {@code rows} 는 반출한 격리 행 수, {@code keyPersonalShapes} 는 정렬 키 컬럼마다
     * 주민등록번호·전화번호·이메일 모양이 든 행 수다.
     */
    public record KeyExport(String source, long rows, String fileName, long bytes, String sha256,
                            Map<String, PersonalShapes> keyPersonalShapes) {

        public KeyExport {
            keyPersonalShapes = copy(keyPersonalShapes);
        }

        /** 정렬 키 모양 수가 없는 결과(시험 보조). */
        public KeyExport(String source, long rows, String fileName, long bytes, String sha256) {
            this(source, rows, fileName, bytes, sha256, Map.of());
        }
    }

    private static Map<String, PersonalShapes> copy(Map<String, PersonalShapes> shapes) {
        return shapes == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(shapes));
    }
}
