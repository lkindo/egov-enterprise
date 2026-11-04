package nuri.foundation.core.persistence;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/**
 * PostgreSQL 의 REPEATABLE READ 는 스냅숏 격리다. 같은 뜻의 벤더 격리 수준으로 연결에서 바꾼다. 호출부의 {@code @Transactional} 은
 * 벤더 공통으로 둔다.
 *
 * <ul>
 *   <li>Oracle 은 READ COMMITTED 와 SERIALIZABLE 만 받고, 그 SERIALIZABLE 이 스냅숏 격리다. 쓰기 충돌은 ORA-08177 이다.</li>
 *   <li>SQL Server 의 REPEATABLE READ 는 읽은 행에 공유 잠금을 끝까지 쥐는 잠금 격리다(실측). 스냅숏 격리({@link #SQL_SERVER_SNAPSHOT})가
 *       같은 뜻이고 쓰기 충돌은 3960 이다.</li>
 * </ul>
 */
final class IsolationMappingDataSource extends DelegatingDataSource {

    /** mssql-jdbc 의 {@code SQLServerConnection.TRANSACTION_SNAPSHOT}. 드라이버를 컴파일 의존성으로 두지 않으려고 값을 둔다. */
    static final int SQL_SERVER_SNAPSHOT = 0x1000;

    private final int repeatableRead;

    IsolationMappingDataSource(DataSource target, int repeatableRead) {
        super(target);
        this.repeatableRead = repeatableRead;
    }

    @Override
    public Connection getConnection() throws SQLException {
        return mapped(super.getConnection());
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return mapped(super.getConnection(username, password));
    }

    private Connection mapped(Connection connection) {
        return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[] {Connection.class}, (proxy, method, args) -> {
            if ("equals".equals(method.getName())) {
                return proxy == args[0];
            }
            Object[] arguments = args;
            if ("setTransactionIsolation".equals(method.getName()) && Integer.valueOf(Connection.TRANSACTION_REPEATABLE_READ).equals(args[0])) {
                arguments = new Object[] {repeatableRead};
            }
            try {
                return method.invoke(connection, arguments);
            } catch (InvocationTargetException failure) {
                throw failure.getCause();
            }
        });
    }
}
