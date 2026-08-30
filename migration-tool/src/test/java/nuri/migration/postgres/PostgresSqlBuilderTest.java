package nuri.migration.postgres;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostgresSqlBuilderTest {

    @Test
    void quotedIdentifiersSafelySupportReservedMixedCaseAndUnicodeNames() {
        assertThat(PostgresIdentifier.of("select").sql()).isEqualTo("\"select\"");
        assertThat(PostgresIdentifier.of("OrderId").sql()).isEqualTo("\"OrderId\"");
        assertThat(PostgresIdentifier.of("사용자").sql()).isEqualTo("\"사용자\"");
        assertThat(PostgresQualifiedName.of("Legacy", "Order").sql())
                .isEqualTo("\"Legacy\".\"Order\"");
    }

    @Test
    void identifierSegmentsRejectRawSqlAndAmbiguousQualifiedInput() {
        for (String invalid : List.of("", "schema.table", "user;drop", "has space", "--comment", "a\nb")) {
            assertThatThrownBy(() -> PostgresIdentifier.of(invalid))
                    .as(invalid)
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void projectionSelectUsesOnlyExplicitColumnsAndQuotedNames() {
        String sql = PostgresSqlBuilder.projectionSelect(
                PostgresQualifiedName.of("legacy", "Order"),
                List.of(PostgresIdentifier.of("select"), PostgresIdentifier.of("사용자명")));

        assertThat(sql).isEqualTo(
                "SELECT \"select\", \"사용자명\" FROM \"legacy\".\"Order\"");
        assertThat(sql).doesNotContain("*");
        assertThatThrownBy(() -> PostgresSqlBuilder.projectionSelect(
                PostgresQualifiedName.of("legacy", "orders"), List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void insertReturningSupportsCompositeGeneratedIdentity() {
        String sql = PostgresSqlBuilder.insertReturning(
                PostgresQualifiedName.of("public", "tb_order"),
                List.of(PostgresIdentifier.of("tenant_id"), PostgresIdentifier.of("payload")),
                List.of(PostgresIdentifier.of("tenant_id"), PostgresIdentifier.of("order_id")));

        assertThat(sql).isEqualTo("INSERT INTO \"public\".\"tb_order\" "
                + "(\"tenant_id\", \"payload\") VALUES (?, ?) "
                + "RETURNING \"tenant_id\", \"order_id\"");
    }

    @Test
    void sequenceSyncIsAParameterizedPlanAndDoesNotInterpolateTheSequence() {
        PostgresSequenceSyncPlan plan = PostgresSqlBuilder.sequenceSyncPlan(
                PostgresQualifiedName.of("public", "sq_order"),
                PostgresQualifiedName.of("public", "tb_order"),
                PostgresIdentifier.of("order_id"),
                1L);

        assertThat(plan.sql()).isEqualTo("SELECT setval(CAST(? AS regclass), "
                + "COALESCE((SELECT MAX(\"order_id\") FROM \"public\".\"tb_order\"), ?), "
                + "EXISTS (SELECT 1 FROM \"public\".\"tb_order\"))");
        assertThat(plan.parameters()).containsExactly("\"public\".\"sq_order\"", 1L);
        assertThat(plan.sql()).doesNotContain("sq_order");

        PostgresSequenceSyncPlan descendingPlan = PostgresSqlBuilder.sequenceSyncPlan(
                PostgresQualifiedName.of("public", "sq_order"),
                PostgresQualifiedName.of("public", "tb_order"),
                PostgresIdentifier.of("order_id"),
                -1L);
        assertThat(descendingPlan.parameters()).containsExactly("\"public\".\"sq_order\"", -1L);
    }
}
