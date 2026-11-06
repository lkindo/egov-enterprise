package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 드라이버 동작은 CUBRID 통합 시험이 본다. 여기서는 바꿔 주는 값과 멈추는 경우를 고정한다. */
class CubridJdbcDataSourceTest {

    private final DataSource target = mock(DataSource.class);
    private final Connection connection = mock(Connection.class);
    private final PreparedStatement statement = mock(PreparedStatement.class);
    private final ResultSet rows = mock(ResultSet.class);

    private Connection open() throws SQLException {
        when(target.getConnection()).thenReturn(connection);
        when(connection.prepareStatement("q")).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        return new CubridJdbcDataSource(target).getConnection();
    }

    @Test
    @DisplayName("java.time·UUID 바인딩은 드라이버가 받는 java.sql 값·문자열로 바꾸고, 시각은 밀리초로 자르며, 다른 값은 그대로 넘긴다")
    void bindsJavaTimeAsJdbcValues() throws Exception {
        PreparedStatement prepared = open().prepareStatement("q");
        UUID key = UUID.fromString("6f1c3f0e-1b2a-4c3d-9e8f-0a1b2c3d4e5f");

        prepared.setObject(1, LocalDateTime.of(2026, 1, 2, 3, 4, 5, 123_456_789));
        prepared.setObject(2, LocalDate.of(2026, 1, 2), java.sql.Types.DATE);
        prepared.setObject(3, key);
        prepared.setObject(4, 7L);

        verify(statement).setObject(1, Timestamp.valueOf("2026-01-02 03:04:05.123"));
        prepared.setTimestamp(5, Timestamp.valueOf("2026-01-02 03:04:05.123456"));
        verify(statement).setTimestamp(5, Timestamp.valueOf("2026-01-02 03:04:05.123"));
        verify(statement).setObject(2, java.sql.Date.valueOf("2026-01-02"), java.sql.Types.DATE);
        verify(statement).setObject(3, key.toString());
        verify(statement).setObject(4, 7L);
    }

    @Test
    @DisplayName("타입 지정 조회는 같은 뜻의 값으로 읽는다 — 드라이버는 어떤 타입이든 거부한다")
    void readsTypedColumns() throws Exception {
        ResultSet read = open().prepareStatement("q").executeQuery();
        when(rows.getObject("ntce_bgnde")).thenReturn(java.sql.Date.valueOf("2026-11-06"));
        when(rows.getObject("cmnty_sn")).thenReturn(42);
        when(rows.getObject(3)).thenReturn(Timestamp.valueOf("2026-11-06 11:23:47.202"));
        when(rows.getObject("empty")).thenReturn(null);

        assertThat(read.getObject("ntce_bgnde", LocalDate.class)).isEqualTo(LocalDate.of(2026, 11, 6));
        assertThat(read.getObject("cmnty_sn", Long.class)).isEqualTo(42L);
        assertThat(read.getObject(3, LocalDateTime.class)).isEqualTo(LocalDateTime.of(2026, 11, 6, 11, 23, 47, 202_000_000));
        assertThat(read.getObject("empty", Long.class)).isNull();
    }

    @Test
    @DisplayName("정수로 정확히 담기지 않거나 모르는 변환은 멈춘다 — 다른 값을 조용히 주지 않는다")
    void refusesLossyConversions() throws Exception {
        ResultSet read = open().prepareStatement("q").executeQuery();
        when(rows.getObject(1)).thenReturn(new BigDecimal("1.5"));
        when(rows.getObject(2)).thenReturn("text");

        assertThatThrownBy(() -> read.getObject(1, Long.class)).isInstanceOf(SQLException.class).hasMessageContaining("정확히 담기지 않는다");
        assertThatThrownBy(() -> read.getObject(2, LocalDate.class)).isInstanceOf(SQLException.class).hasMessageContaining("읽을 수 없다");
    }

    @Test
    @DisplayName("TIME 은 초까지 담는다 — 초 단위 시각은 바인딩하고 소수초가 있는 시각은 자르지 않고 멈춘다")
    void refusesFractionalTimes() throws Exception {
        PreparedStatement prepared = open().prepareStatement("q");

        prepared.setObject(1, java.time.LocalTime.of(12, 34, 56));
        verify(statement).setObject(1, java.sql.Time.valueOf("12:34:56"));
        assertThatThrownBy(() -> prepared.setObject(2, java.time.LocalTime.parse("12:34:56.789"))).isInstanceOf(SQLException.class)
                .hasMessageContaining("초까지 담는다");
    }

    @Test
    @DisplayName("저장 프로시저도 이름 바인딩을 바꾸고 출력 매개변수의 타입 지정 조회를 같은 뜻의 값으로 읽는다")
    void convertsCallableStatements() throws Exception {
        CallableStatement call = mock(CallableStatement.class);
        when(target.getConnection()).thenReturn(connection);
        when(connection.prepareCall("c")).thenReturn(call);
        when(call.getObject(1)).thenReturn(Timestamp.valueOf("2026-11-07 01:02:03.456"));
        when(call.getObject("cnt")).thenReturn(new BigDecimal("1.5"));
        CallableStatement wrapped = new CubridJdbcDataSource(target).getConnection().prepareCall("c");

        wrapped.setObject("bgnde", LocalDate.of(2026, 11, 7));
        verify(call).setObject("bgnde", java.sql.Date.valueOf("2026-11-07"));
        assertThat(wrapped.getObject(1, LocalDateTime.class)).isEqualTo(LocalDateTime.of(2026, 11, 7, 1, 2, 3, 456_000_000));
        assertThatThrownBy(() -> wrapped.getObject("cnt", Long.class)).isInstanceOf(SQLException.class).hasMessageContaining("정확히 담기지 않는다");
    }

    @Test
    @DisplayName("갱신 가능한 결과 집합의 값 쓰기도 바인딩과 같은 값으로 바꾼다")
    void convertsResultSetUpdates() throws Exception {
        ResultSet read = open().prepareStatement("q").executeQuery();

        read.updateObject(1, LocalDateTime.of(2026, 1, 2, 3, 4, 5, 123_456_789));
        read.updateObject("atch_file_id", UUID.fromString("6f1c3f0e-1b2a-4c3d-9e8f-0a1b2c3d4e5f"), java.sql.Types.CHAR);
        read.updateTimestamp(3, Timestamp.valueOf("2026-01-02 03:04:05.123456"));

        verify(rows).updateObject(1, Timestamp.valueOf("2026-01-02 03:04:05.123"));
        verify(rows).updateObject("atch_file_id", "6f1c3f0e-1b2a-4c3d-9e8f-0a1b2c3d4e5f", java.sql.Types.CHAR);
        verify(rows).updateTimestamp(3, Timestamp.valueOf("2026-01-02 03:04:05.123"));
    }

    @Test
    @DisplayName("메타데이터는 감싼 연결을 돌려주고 그 결과 집합도 타입 지정 조회를 옮긴다 — 원래 연결로 새는 길이 없다")
    void wrapsMetadata() throws Exception {
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet tables = mock(ResultSet.class);
        when(target.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getTables(null, null, "%", null)).thenReturn(tables);
        when(tables.getObject("ordinal")).thenReturn(7);
        Connection wrapped = new CubridJdbcDataSource(target).getConnection();

        DatabaseMetaData read = wrapped.getMetaData();
        assertThat(read.getConnection()).isSameAs(wrapped);
        ResultSet rowsOfTables = read.getTables(null, null, "%", null);
        assertThat(rowsOfTables.getObject("ordinal", Long.class)).isEqualTo(7L);
        assertThat(rowsOfTables.getStatement()).isNull();
    }

    @Test
    @DisplayName("드라이버 고유 객체를 찾는 unwrap 은 원래 연결에 묻고, 문장은 감싼 연결을 돌려준다")
    void unwrapReachesTheDriver() throws Exception {
        Connection wrapped = open();
        when(connection.unwrap(String.class)).thenReturn("driver");

        assertThat(wrapped.unwrap(String.class)).isEqualTo("driver");
        assertThat(wrapped.unwrap(Connection.class)).isSameAs(wrapped);
        assertThat(wrapped.prepareStatement("q").getConnection()).isSameAs(wrapped);
    }
}
