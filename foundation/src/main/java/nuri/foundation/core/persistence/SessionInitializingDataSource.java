package nuri.foundation.core.persistence;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/**
 * 연결을 꺼낼 때마다 세션 설정 문장 하나를 건다. 연결 초기화 문장을 받지 못하는 DataSource 용이다(Hikari 풀은 풀 설정으로 건다,
 * VendorSqlConfig). 같은 값을 다시 걸어도 결과가 같은 문장만 쓴다.
 */
final class SessionInitializingDataSource extends DelegatingDataSource {

    private final String sql;

    SessionInitializingDataSource(DataSource target, String sql) {
        super(target);
        this.sql = sql;
    }

    @Override
    public Connection getConnection() throws SQLException {
        return initialized(super.getConnection());
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return initialized(super.getConnection(username, password));
    }

    private Connection initialized(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        } catch (SQLException | RuntimeException failure) {
            connection.close();
            throw failure;
        }
        return connection;
    }
}
