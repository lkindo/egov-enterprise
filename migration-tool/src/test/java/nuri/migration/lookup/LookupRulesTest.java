package nuri.migration.lookup;

import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** [ADR-0029 L3d, DEC-OPS-320] 조회 조인 선언의 정적 규칙 — 정적 검증기와 실행기가 같은 판정을 쓴다. */
class LookupRulesTest {

    private static final Lookup CUST = new Lookup("cust", "legacy.customer", "USE_YN = 'Y'",
            new LookupKey("CUST_NO", "CUST_NO"), LookupCardinality.EXACTLY_ONE, null);

    @Test
    void aDeclaredLookupThatAColumnReadsPasses() {
        TableMapping orders = orders("orders", "ORDER_NO", List.of(CUST), cust("CUST_NM", "cust_nm"));

        assertThat(LookupRules.violations(orders)).isEmpty();
        assertThat(LookupRules.violations(List.of(orders, plain()))).isEmpty();
        // 조회하지 않는 매핑에는 id·순서 키를 요구하지 않는다.
        assertThat(LookupRules.violations(plain())).isEmpty();
        assertThat(LookupRules.ALIAS.pattern()).isEqualTo("[a-z][a-z0-9_]{0,62}");
    }

    @Test
    void aLookingUpMappingNeedsAnIdAndAnOrderKeyInEveryMode() {
        assertThat(LookupRules.violations(orders(null, null, List.of(CUST), cust("CUST_NM", "cust_nm"))))
                .containsExactly(
                        "legacy.orders: 조회 조인(lookups)을 쓰는 매핑에는 id 가 필요합니다 — 원장의 via.mapping 이 이 id 를"
                                + " 가리킵니다",
                        "legacy.orders: 조회 조인(lookups)에는 orderBy/orderByKeys 가 필수입니다 — 순서 없는 읽기는 결과를 연"
                                + " 채 조회 문장을 보낼 수 없습니다");
        TableMapping byKeys = new TableMapping("legacy.orders", "public.tb_order", null, null, List.of("ORDER_NO"),
                "order_no", List.of(cust("CUST_NM", "cust_nm")), null, null, List.of(), "orders", List.of(CUST));
        assertThat(LookupRules.violations(byKeys)).isEmpty();
    }

    @Test
    void eachLookupIsWellFormed() {
        List<Lookup> lookups = new ArrayList<>(Arrays.asList(
                null,
                new Lookup("Cust", "legacy.customer", null, new LookupKey("A", "B"), LookupCardinality.EXACTLY_ONE, null),
                new Lookup("cust", "legacy.customer", null, new LookupKey("CUST_NO", "CUST_NO"),
                        LookupCardinality.EXACTLY_ONE, null),
                new Lookup("cust", "bad source!", null, new LookupKey("CUST_NO", "CUST_NO"),
                        LookupCardinality.EXACTLY_ONE, null),
                new Lookup("dept", null, null, null, null, null),
                new Lookup("grade", "legacy.grade", null, new LookupKey("GRADE CD", "GRADE_CD"),
                        LookupCardinality.AT_MOST_ONE, null),
                new Lookup("zone", "a.b.c.d", null, new LookupKey("ZONE_CD", null),
                        LookupCardinality.AT_MOST_ONE, -1L),
                new Lookup("unit", "legacy.unit", null, new LookupKey("UNIT_CD", "UNIT_CD"),
                        LookupCardinality.EXACTLY_ONE, 3L),
                new Lookup("spare", "legacy.spare", null, new LookupKey("SPARE", "SPARE"),
                        LookupCardinality.AT_MOST_ONE, 0L)));
        TableMapping orders = orders("orders", "ORDER_NO", lookups, cust("CUST_NM", "cust_nm"),
                column("dept.DEPT_NM", "dept_nm"), column("grade.GRADE_NM", "grade_nm"),
                column("zone.ZONE_NM", "zone_nm"), column("unit.UNIT_NM", "unit_nm"),
                column("spare.SPARE_NM", "spare_nm"));

        assertThat(LookupRules.violations(orders)).containsExactly(
                "legacy.orders#orders: lookups[0] 항목은 null 일 수 없습니다",
                "legacy.orders#orders: lookups[1] 의 alias 는 소문자로 시작하는 소문자·숫자·밑줄 63자 이내여야 합니다",
                "legacy.orders#orders.lookups[cust]: 같은 별칭을 두 번 선언했습니다",
                "legacy.orders#orders.lookups[cust]: source 는 조회할 소스 표(schema.table)여야 합니다",
                "legacy.orders#orders.lookups[dept]: source 는 조회할 소스 표(schema.table)여야 합니다",
                "legacy.orders#orders.lookups[dept]: key 에는 이 매핑의 컬럼(from)과 조회 표의 컬럼(to)이 하나씩 필요합니다"
                        + " — 복합 키는 받지 않습니다",
                "legacy.orders#orders.lookups[dept]: cardinality(exactly_one·at_most_one)가 필요합니다",
                "legacy.orders#orders.lookups[grade]: key 에는 이 매핑의 컬럼(from)과 조회 표의 컬럼(to)이 하나씩"
                        + " 필요합니다 — 복합 키는 받지 않습니다",
                "legacy.orders#orders.lookups[grade]: at_most_one 에는 0 이상의 maxMissing 이 필요합니다 — 짝 없는 행을"
                        + " 몇 행까지 받을지 정합니다",
                "legacy.orders#orders.lookups[zone]: source 는 조회할 소스 표(schema.table)여야 합니다",
                "legacy.orders#orders.lookups[zone]: key 에는 이 매핑의 컬럼(from)과 조회 표의 컬럼(to)이 하나씩 필요합니다"
                        + " — 복합 키는 받지 않습니다",
                "legacy.orders#orders.lookups[zone]: at_most_one 에는 0 이상의 maxMissing 이 필요합니다 — 짝 없는 행을"
                        + " 몇 행까지 받을지 정합니다",
                "legacy.orders#orders.lookups[unit]: exactly_one 에는 maxMissing 을 둘 수 없습니다 — 짝 없는 행은 멈춥니다");
    }

    @Test
    void aColumnReadsOnlyADeclaredAliasCannotTranslateAKeyAndEveryLookupIsRead() {
        Lookup unread = new Lookup("dept", "legacy.dept", null, new LookupKey("DEPT_CD", "DEPT_CD"),
                LookupCardinality.EXACTLY_ONE, null);
        TableMapping orders = orders("orders", "ORDER_NO", List.of(CUST, unread), cust("CUST_NM", "cust_nm"),
                column("cust.CUST NM", "cust_nm2"),
                new ColumnMapping("cust.CUST_NO", "cust_no", null, null, null, "legacy.customer", null),
                column("ghost.X", "x"), column("Bad Alias!.X", "y"));

        assertThat(LookupRules.violations(orders)).containsExactly(
                "legacy.orders#orders.cust_nm2: 조회 컬럼은 별칭.컬럼 형식이어야 합니다",
                "legacy.orders#orders.cust_no: 조회한 컬럼은 fkRef 로 번역할 수 없습니다 — 부모 키는 이 매핑 소스의"
                        + " 컬럼에서 읽으세요",
                "legacy.orders#orders.x: 조회 별칭 'ghost' 를 이 매핑의 lookups 에 선언하지 않았습니다",
                "legacy.orders#orders.y: 조회 별칭 '<형식 밖>' 를 이 매핑의 lookups 에 선언하지 않았습니다",
                "legacy.orders#orders.lookups[dept]: 어떤 컬럼도 읽지 않는 조회입니다 — 쓰지 않으면 지우세요");
        // 조회를 선언하지 않은 매핑의 alias.COLUMN 도 거부한다(주 표의 컬럼 이름에는 점이 없다).
        assertThat(LookupRules.violations(orders(null, "ORDER_NO", List.of(), cust("CUST_NM", "cust_nm"))))
                .containsExactly("legacy.orders.cust_nm: 조회 별칭 'cust' 를 이 매핑의 lookups 에 선언하지 않았습니다");
    }

    @Test
    void aTableMappingFindsItsLookupByAlias() {
        TableMapping orders = orders("orders", "ORDER_NO", Arrays.asList(null, CUST), cust("CUST_NM", "cust_nm"));

        assertThat(orders.lookup("cust")).isSameAs(CUST);
        assertThat(orders.lookup("dept")).isNull();
        assertThat(orders.lookup(null)).isNull();
        assertThat(plain().lookups()).isEmpty();
        assertThatThrownBy(() -> orders.lookups().add(CUST)).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> LookupRules.violations((TableMapping) null)).isInstanceOf(NullPointerException.class);
        assertThat(LookupRules.violations(Arrays.asList(null, plain()))).isEmpty();
    }

    @Test
    void cardinalityAndMaxMissingAreReadOnlyAsWritten() {
        assertThat(LookupCardinality.parse("exactly_one")).isEqualTo(LookupCardinality.EXACTLY_ONE);
        assertThat(LookupCardinality.parse("at_most_one")).isEqualTo(LookupCardinality.AT_MOST_ONE);
        assertThat(LookupCardinality.AT_MOST_ONE.externalName()).isEqualTo("at_most_one");
        for (String invalid : Arrays.asList("EXACTLY_ONE", "one", null)) {
            assertThatThrownBy(() -> LookupCardinality.parse(invalid)).as(String.valueOf(invalid))
                    .hasMessage("lookup 의 cardinality 는 exactly_one·at_most_one 중 하나여야 합니다");
        }
        assertThat(Lookup.fromMapping("cust", "s.t", null, null, LookupCardinality.AT_MOST_ONE, 3).maxMissing())
                .isEqualTo(3L);
        assertThat(Lookup.fromMapping("cust", "s.t", null, null, null, (short) 2).maxMissing()).isEqualTo(2L);
        assertThat(Lookup.fromMapping("cust", "s.t", null, null, null, (byte) 1).maxMissing()).isEqualTo(1L);
        assertThat(Lookup.fromMapping("cust", "s.t", null, null, null, 4L).maxMissing()).isEqualTo(4L);
        assertThat(Lookup.fromMapping("cust", "s.t", null, null, null, null).maxMissing()).isNull();
        for (Object invalid : List.of(2.7d, "3")) {
            assertThatThrownBy(() -> Lookup.fromMapping("cust", "s.t", null, null, null, invalid))
                    .hasMessage("lookup 의 maxMissing 은 정수여야 합니다");
        }
    }

    private static TableMapping orders(String id, String orderBy, List<Lookup> lookups, ColumnMapping... columns) {
        return new TableMapping("legacy.orders", "public.tb_order", null, orderBy, List.of(), "order_no",
                List.of(columns), null, null, List.of(), id, lookups);
    }

    private static TableMapping plain() {
        return new TableMapping("legacy.customer", "public.tb_cust", null, "CUST_NO", "cust_no",
                List.of(column("CUST_NM", "cust_nm")), null);
    }

    private static ColumnMapping cust(String column, String target) {
        return column("cust." + column, target);
    }

    private static ColumnMapping column(String source, String target) {
        return new ColumnMapping(source, target, null, null, null, null, null);
    }
}
