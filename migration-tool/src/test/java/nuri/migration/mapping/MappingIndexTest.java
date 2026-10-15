package nuri.migration.mapping;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** [ADR-0029 L3c] 매핑 키·keymap 소유 매핑·부모 판정. 정적 검증·실행 순서·실행기·플래너가 이 판정 하나를 쓴다. */
class MappingIndexTest {

    @Test
    void splitMappingsAreDistinctKeysUnderOneSourceAndTheOwnerIsTheParent() {
        TableMapping main = owner("LEGACY_USER", "tb_user", null);
        TableMapping detail = plain("legacy_user", "tb_user_detail", "detail");

        MappingIndex index = MappingIndex.of(List.of(main, detail));

        assertThat(index.errors()).isEmpty();
        assertThat(index.keys()).containsExactly(
                new MappingKey("legacy_user", ""), new MappingKey("legacy_user", "detail"));
        assertThat(index.mappingsOf("Legacy_User")).containsExactly(main, detail);
        assertThat(index.owner("legacy_user")).isSameAs(main);
        assertThat(index.parent("LEGACY_USER")).isSameAs(main);
        // 소유 매핑만 자기 소스의 부모로 풀린다 — 확장 매핑이 자기 소스를 가리키면 소유 매핑에 대한 일반 간선이다.
        assertThat(index.resolvesTo("legacy_user", main)).isTrue();
        assertThat(index.resolvesTo("legacy_user", detail)).isFalse();
        assertThat(index.sameSource(detail, "LEGACY_USER")).isTrue();
        assertThat(index.sameSource(detail, "legacy_dept")).isFalse();
        assertThat(index.key(detail).label()).isEqualTo("legacy_user#detail");
        assertThat(MappingIndex.label(detail)).isEqualTo("legacy_user#detail");
        assertThat(MappingIndex.label(main)).isEqualTo("LEGACY_USER");
        assertThat(index.find(new MappingKey("legacy_user", "detail"))).isSameAs(detail);
    }

    @Test
    void aSingleMappingWithoutKeyMapIsItsOwnParentButSeveralWithoutAnOwnerHaveNone() {
        TableMapping only = plain("legacy_code", "tb_code", null);
        TableMapping first = plain("legacy_note", "tb_note", "body");
        TableMapping second = plain("legacy_note", "tb_note_meta", "meta");

        MappingIndex index = MappingIndex.of(List.of(only, first, second));

        assertThat(index.errors()).isEmpty();
        assertThat(index.parent("legacy_code")).isSameAs(only);
        assertThat(index.owner("legacy_code")).isNull();
        assertThat(index.parent("legacy_note")).isNull();
        assertThat(index.parent("legacy_absent")).isNull();
        assertThat(index.parent(" ")).isNull();
        assertThat(index.mappingsOf("legacy_absent")).isEmpty();
    }

    @Test
    void twoDefaultMappingsOfOneSourceAreDuplicatesEvenWhenTheNotationDiffersOnlyInCase() {
        MappingIndex index = MappingIndex.of(List.of(
                plain("legacy_user", "tb_user", null), plain("LEGACY_USER", "tb_ognz", null)));

        assertThat(index.errors()).singleElement().asString()
                .contains("중복 소스 테이블 매핑 금지", "LEGACY_USER", "id 를");
    }

    @Test
    void namedIdsMustBeWellFormedUniquePerSourceAndNotReusedAcrossSources() {
        MappingIndex index = MappingIndex.of(List.of(
                plain("legacy_a", "tb_a", "Main"),
                plain("legacy_a", "tb_b", "detail"),
                plain("legacy_a", "tb_c", "detail"),
                plain("legacy_b", "tb_d", "detail")));

        assertThat(index.errors()).anySatisfy(error -> assertThat(error)
                .contains("legacy_a", "매핑 id 는 소문자로 시작"));
        assertThat(index.errors()).anySatisfy(error -> assertThat(error)
                .contains("중복 소스 테이블 매핑 금지", "legacy_a#detail"));
        assertThat(index.errors()).anySatisfy(error -> assertThat(error)
                .contains("매핑 id 'detail'", "두 소스 표"));
        assertThat(MappingIndex.of(List.of(plain("legacy_a", "tb_a", "x".repeat(64)))).errors())
                .singleElement().asString().contains("63자");
        assertThat(MappingIndex.of(List.of(plain("legacy_a", "tb_a", "")))
                .errors()).singleElement().asString().contains("매핑 id");
    }

    @Test
    void onlyOneMappingPerSourceMayMintTheKeyMap() {
        TableMapping legacy = owner("legacy_user", "tb_user", null);
        TableMapping typed = new TableMapping("legacy_user", "tb_user_copy", null, null, List.of("USER_ID"), null,
                List.of(), null, new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                List.of(new IdentityComponentSpec("USER_ID", IdentityValueType.TEXT)),
                List.of(new IdentityComponentSpec("user_id", IdentityValueType.TEXT))), List.of(), "copy");

        MappingIndex index = MappingIndex.of(List.of(legacy, typed));

        assertThat(index.errors()).singleElement().asString()
                .contains("legacy_user", "keymap 을 만드는 매핑", "둘 이상");
        assertThat(index.owner("legacy_user")).isSameAs(legacy);
    }

    @Test
    void plannerKeysByInventoryIdAndBlocksTheSameTableWrittenTwoWays() {
        Map<String, String> stableIds = Map.of("legacy.user_mst", "T1", "LEGACY.USER_MST", "T1",
                "user_mst", "T1");
        MappingIndex consistent = MappingIndex.of(List.of(
                owner("legacy.user_mst", "tb_user", null),
                plain("LEGACY.USER_MST", "tb_user_detail", "detail")), stableIds::get);
        MappingIndex twoWays = MappingIndex.of(List.of(
                owner("legacy.user_mst", "tb_user", null),
                plain("user_mst", "tb_user_detail", "detail")), stableIds::get);
        MappingIndex unresolved = MappingIndex.of(List.of(plain("legacy.absent", "tb_x", null)), stableIds::get);

        // 대소문자만 다른 표기는 같은 표기다(제어 테이블은 소문자 source_table 을 쓴다).
        assertThat(consistent.errors()).isEmpty();
        assertThat(consistent.keys()).containsExactly(new MappingKey("T1", ""), new MappingKey("T1", "detail"));
        assertThat(twoWays.errors()).singleElement().asString()
                .contains("같은 소스 표를 가리키는 매핑의 소스 표기가 다릅니다", "user_mst");
        assertThat(unresolved.errors()).isEmpty();
        assertThat(unresolved.keys()).isEmpty();
    }

    private static TableMapping owner(String source, String target, String id) {
        return new TableMapping(source, target, null, "USER_ID", List.of(), null,
                List.of(new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null)),
                new IdStrategy("esntl_id", "USR", "USER_ID"), null, List.of(), id);
    }

    private static TableMapping plain(String source, String target, String id) {
        return new TableMapping(source, target, null, "USER_ID", List.of(), "user_id",
                List.of(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null)),
                null, null, List.of(), id);
    }
}
