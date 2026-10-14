package nuri.migration.validate.ledger;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.artifact.ArtifactRedactionGuard;

import java.io.IOException;
import java.util.Objects;

/**
 * 원장 파일(YAML 또는 JSON)을 읽는다. 모르는 필드는 오탈자일 수 있어 거부하고, 행 수·상한 같은 정수 칸에 소수를 쓰면
 * 잘라 읽지 않고 거부하며, 같은 키를 두 번 쓰면(뒤 값만 남는다) 거부한다 — 검토자가 본 글자와 승인이 뜻하는 값이
 * 달라지지 않게 한다. 원장에는 원시 값·접속정보가
 * 없어야 하므로 자격 검사와 개인정보 값 검사를 모두 지나야 한다. 실패 메시지는 고정 문구다 — 원장 내용을 되풀이하지
 * 않는다.
 *
 * <p>형식 1 원장은 읽지 않는다(ADR-0029 L3a-2) — 확정 행의 load 와 위반 기록 형식이 바뀌어 옛 행을 그대로 확정으로 읽을
 * 수 없다.</p>
 */
public final class TermLedgerLoader {

    static final String FORMAT_1 = "용어 매핑 원장 형식 1 은 더 이상 읽지 않습니다 — schemaVersion: 2 로 올리고 확정 행마다"
            + " load(변환·type·codemap·nullify)를, conformance 에는 violations·unmeasured 를 적어 형식 2 로 옮기세요"
            + "(term-suggest --ledger-draft 가 형식 2 초안을 만듭니다)";

    private final YAMLMapper yaml = YAMLMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .configure(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, true)
            .configure(DeserializationFeature.ACCEPT_FLOAT_AS_INT, false)
            .build();

    public TermLedger load(String content) {
        Objects.requireNonNull(content, "content");
        JsonNode tree;
        try {
            tree = yaml.readTree(content);
        } catch (IOException | IllegalArgumentException failure) {
            throw new IllegalArgumentException("용어 매핑 원장 형식이 맞지 않습니다");
        }
        if (tree != null && tree.isObject() && tree.path("schemaVersion").isIntegralNumber()
                && tree.path("schemaVersion").asLong() == 1) {
            throw new IllegalArgumentException(FORMAT_1);
        }
        TermLedger ledger;
        try {
            ledger = yaml.treeToValue(tree, TermLedger.class);
        } catch (IOException | IllegalArgumentException failure) {
            throw new IllegalArgumentException("용어 매핑 원장 형식이 맞지 않습니다");
        }
        if (ledger == null) {
            throw new IllegalArgumentException("용어 매핑 원장이 비어 있습니다");
        }
        try {
            ArtifactRedactionGuard.assertSafe(tree);
            ArtifactRedactionGuard.assertNoPersonalValues(tree);
        } catch (IllegalArgumentException sensitive) {
            throw new IllegalArgumentException("용어 매핑 원장에 자격·개인정보로 보이는 값이 있습니다");
        }
        return ledger;
    }
}
