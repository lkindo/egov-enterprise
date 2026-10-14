package nuri.migration.validate.ledger;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.artifact.ArtifactRedactionGuard;

import java.io.IOException;
import java.util.Objects;

/**
 * 원장 파일(YAML 또는 JSON)을 읽는다. 모르는 필드는 오탈자일 수 있어 거부한다. 원장에는 원시 값·접속정보가 없어야
 * 하므로 자격 검사와 개인정보 값 검사를 모두 지나야 한다. 실패 메시지는 고정 문구다 — 원장 내용을 되풀이하지 않는다.
 */
public final class TermLedgerLoader {

    private final YAMLMapper yaml = YAMLMapper.builder()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .configure(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, true)
            .build();

    public TermLedger load(String content) {
        Objects.requireNonNull(content, "content");
        JsonNode tree;
        TermLedger ledger;
        try {
            tree = yaml.readTree(content);
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
