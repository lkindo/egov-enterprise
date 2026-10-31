package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class IsolationMappingDataSourceTest {

    private final DataSource target = mock(DataSource.class);
    private final Connection physical = mock(Connection.class);
    private Connection connection;

    @BeforeEach
    void connect() throws SQLException {
        when(target.getConnection()).thenReturn(physical);
        when(target.getConnection("user", "secret")).thenReturn(physical);
        connection = new IsolationMappingDataSource(target).getConnection();
    }

    @Test
    @DisplayName("Oracle 이 거부하는 REPEATABLE READ 는 같은 스냅숏 격리인 SERIALIZABLE 로 보낸다")
    void repeatableReadBecomesSerializable() throws SQLException {
        connection.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);

        verify(physical).setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
    }

    @Test
    @DisplayName("계정을 지정한 연결도 같은 변환을 탄다")
    void credentialedConnectionsAreMapped() throws SQLException {
        new IsolationMappingDataSource(target).getConnection("user", "secret")
                .setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);

        verify(physical).setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
    }

    @Test
    @DisplayName("다른 격리 수준과 다른 호출은 그대로 넘긴다")
    void everythingElsePassesThrough() throws SQLException {
        when(physical.getTransactionIsolation()).thenReturn(Connection.TRANSACTION_READ_COMMITTED);

        connection.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        connection.setAutoCommit(false);

        verify(physical).setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        verify(physical).setAutoCommit(false);
        assertThat(connection.getTransactionIsolation()).isEqualTo(Connection.TRANSACTION_READ_COMMITTED);
    }

    @Test
    @DisplayName("드라이버 오류는 프록시 예외로 감싸지 않고 SQLException 그대로 올린다 — 오류 분류가 벤더 번호를 읽는다")
    void driverFailuresKeepTheirType() throws SQLException {
        SQLException failure = new SQLException("failure", "72000", 8177);
        doThrow(failure).when(physical).commit();

        assertThatThrownBy(connection::commit).isSameAs(failure);
    }

    @Test
    @DisplayName("프록시는 자기 자신과 같다 — 연결 보유자가 같은 연결인지 equals 로 비교한다")
    void proxyEqualsItself() {
        assertThat(connection).isEqualTo(connection);
        assertThat(connection.equals(physical)).isFalse();
    }
}
