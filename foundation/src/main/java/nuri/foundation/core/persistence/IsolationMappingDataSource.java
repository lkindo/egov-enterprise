package nuri.foundation.core.persistence;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/**
 * Oracle 은 READ COMMITTED 와 SERIALIZABLE 만 받는다. PostgreSQL 의 REPEATABLE READ 는 스냅숏 격리이고 Oracle 의 SERIALIZABLE 도
 * 스냅숏 격리라 뜻이 같다. 쓰기 충돌은 양쪽 모두 재시도 가능한 오류로 끝난다(40001, ORA-08177). 호출부의 {@code @Transactional} 은
 * 벤더 공통으로 두고 연결에서 바꾼다.
 */
final class IsolationMappingDataSource extends DelegatingDataSource {

    IsolationMappingDataSource(DataSource target) {
        super(target);
    }

    @Override
    public Connection getConnection() throws SQLException {
        return mapped(super.getConnection());
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return mapped(super.getConnection(username, password));
    }

    private static Connection mapped(Connection connection) {
        return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[] {Connection.class}, (proxy, method, args) -> {
            if ("equals".equals(method.getName())) {
                return proxy == args[0];
            }
            Object[] arguments = args;
            if ("setTransactionIsolation".equals(method.getName()) && Integer.valueOf(Connection.TRANSACTION_REPEATABLE_READ).equals(args[0])) {
                arguments = new Object[] {Connection.TRANSACTION_SERIALIZABLE};
            }
            try {
                return method.invoke(connection, arguments);
            } catch (InvocationTargetException failure) {
                throw failure.getCause();
            }
        });
    }
}
