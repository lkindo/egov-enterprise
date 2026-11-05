package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SessionInitializingDataSourceTest {

    private final DataSource target = mock(DataSource.class);
    private final Connection connection = mock(Connection.class);
    private final Statement statement = mock(Statement.class);
    private final SessionInitializingDataSource source = new SessionInitializingDataSource(target, "SET TRANSACTION LOCK TIMEOUT 5");

    @Test
    @DisplayName("자격을 받는 연결도 꺼낼 때 세션 설정을 걸고 문장을 닫는다")
    void initializesConnectionsWithCredentials() throws Exception {
        when(target.getConnection("app", "secret")).thenReturn(connection);
        when(connection.createStatement()).thenReturn(statement);

        assertThat(source.getConnection("app", "secret")).isSameAs(connection);

        verify(statement).execute("SET TRANSACTION LOCK TIMEOUT 5");
        verify(statement).close();
        verify(connection, never()).close();
    }

    @Test
    @DisplayName("세션 설정이 실패하면 연결을 돌려주지 않고 닫는다 — 설정 없이 무한 대기하는 연결이 풀로 가지 않는다")
    void closesTheConnectionWhenInitializationFails() throws Exception {
        when(target.getConnection()).thenReturn(connection);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.execute("SET TRANSACTION LOCK TIMEOUT 5")).thenThrow(new SQLException("broken"));

        assertThatThrownBy(source::getConnection).isInstanceOf(SQLException.class).hasMessage("broken");
        verify(connection).close();
    }
}
