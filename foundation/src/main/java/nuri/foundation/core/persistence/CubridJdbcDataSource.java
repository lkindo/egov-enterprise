package nuri.foundation.core.persistence;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/**
 * CUBRID JDBC 드라이버(11.3)가 구현하지 않은 JDBC 4.1·4.2 동작을 표준 메서드로 옮긴다(ADR-0047 단계 5).
 *
 * <p>드라이버는 {@code setObject} 에 {@code java.time} 값을 주면 {@code IllegalArgumentException} 을 내고, {@code ResultSet.getObject(열, 타입)} 은
 * 어떤 타입이든 {@code UnsupportedOperationException} 을 감싼 SQLException 을 낸다(2026-11-06 실측). JdbcTemplate 의 날짜 바인딩과 타입 지정 조회가 모두
 * 여기에 걸린다. 그래서 날짜·시각과 UUID·BigInteger·Character 는 바인딩 전에 드라이버가 받는 값으로 바꾸고, 타입 지정 조회는 같은 뜻의 표준 접근자로 읽는다.
 *
 * <p>시각 바인딩은 밀리초로 자른다. DATETIME 은 밀리초까지 저장하면서 아래 자리를 버리는데, 같은 값을 조건으로 다시 비교하는 쿼리(메일 발송 시각으로 차지하는
 * 갱신)는 마이크로초가 남은 값을 넘겨 맞는 행이 없었다(2026-11-06 원본 통합 실행). 저장과 비교가 같은 값을 받게 한다 — 원장의 시각 정밀도 저하다.
 *
 * <p>시각은 이 서비스의 벽시계(한국 시간, {@code LocalDateTime})다. 시간대가 있는 값은 JVM 기본 시간대(Asia/Seoul)의 벽시계로 옮긴다 — 앱 시험과 서버
 * 시계가 같은 시간대다(CubridSqlDialect.assertSession).
 */
final class CubridJdbcDataSource extends DelegatingDataSource {

    CubridJdbcDataSource(DataSource target) {
        super(target);
    }

    @Override
    public Connection getConnection() throws SQLException {
        return connection(super.getConnection());
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return connection(super.getConnection(username, password));
    }

    static Connection connection(Connection target) {
        return proxy(Connection.class, target, (proxy, method, args) -> {
            Object result = call(target, method, args);
            return switch (result) {
                case CallableStatement statement -> statement(CallableStatement.class, statement, proxy);
                case PreparedStatement statement -> statement(PreparedStatement.class, statement, proxy);
                case Statement statement -> statement(Statement.class, statement, proxy);
                case null, default -> result;
            };
        });
    }

    private static <S extends Statement> S statement(Class<S> type, S target, Object connection) {
        return proxy(type, target, (proxy, method, args) -> {
            if (method.getName().equals("setObject") && args != null && args.length >= 2) {
                args[1] = bindable(args[1]);
            }
            if (method.getName().equals("setTimestamp") && args != null && args[1] instanceof Timestamp timestamp) {
                args[1] = millis(timestamp);
            }
            if (method.getName().equals("getConnection") && args == null) {
                return connection;
            }
            Object result = call(target, method, args);
            return result instanceof ResultSet rows ? resultSet(rows, proxy) : result;
        });
    }

    private static ResultSet resultSet(ResultSet target, Object statement) {
        return proxy(ResultSet.class, target, (proxy, method, args) -> {
            if (method.getName().equals("getObject") && args != null && args.length == 2 && args[1] instanceof Class<?> type) {
                return args[0] instanceof Integer column ? read(target, column, type) : read(target, (String) args[0], type);
            }
            if (method.getName().equals("getStatement") && args == null) {
                return statement;
            }
            return call(target, method, args);
        });
    }

    /** 드라이버가 받는 값으로 바꾼다. 다른 값은 그대로 넘긴다. */
    static Object bindable(Object value) {
        return switch (value) {
            case Timestamp timestamp -> millis(timestamp);
            case LocalDateTime local -> millis(Timestamp.valueOf(local));
            case LocalDate date -> java.sql.Date.valueOf(date);
            case LocalTime time -> java.sql.Time.valueOf(time);
            case Instant instant -> millis(Timestamp.from(instant));
            case OffsetDateTime offset -> millis(Timestamp.from(offset.toInstant()));
            case ZonedDateTime zoned -> millis(Timestamp.from(zoned.toInstant()));
            case UUID uuid -> uuid.toString();
            // 드라이버는 Boolean·Byte·Short·Integer·Long·Float·Double·BigDecimal·String·java.sql 날짜·byte[] 만 받는다(바이트코드 확인).
            case java.math.BigInteger integer -> new BigDecimal(integer);
            case Character character -> character.toString();
            case null, default -> value;
        };
    }

    /** 밀리초 아래 자리를 버린 같은 시각. 원래 값은 바꾸지 않는다. */
    static Timestamp millis(Timestamp timestamp) {
        if (timestamp.getNanos() % 1_000_000 == 0) {
            return timestamp;
        }
        Timestamp truncated = new Timestamp(timestamp.getTime());
        truncated.setNanos(timestamp.getNanos() / 1_000_000 * 1_000_000);
        return truncated;
    }

    private static Object read(ResultSet rows, int column, Class<?> type) throws SQLException {
        return convert(type, rows.getObject(column));
    }

    private static Object read(ResultSet rows, String column, Class<?> type) throws SQLException {
        return convert(type, rows.getObject(column));
    }

    /**
     * {@code getObject(열)} 의 값을 요청한 타입으로 바꾼다. 드라이버가 숫자는 Integer·Long·BigDecimal, 날짜는 java.sql 값(CUBRIDTimestamp 등)으로 준다.
     * 모르는 변환은 멈춘다 — 다른 값으로 조용히 바꾸면 조회 결과가 바뀐다.
     */
    static Object convert(Class<?> type, Object value) throws SQLException {
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return value;
        }
        if (type == String.class) {
            return value.toString();
        }
        if (value instanceof Number number) {
            // 정수 타입은 정확히 담길 때만 준다. 소수부를 자르거나 범위를 넘겨 조용히 다른 값을 주지 않는다.
            BigDecimal exact = new BigDecimal(number.toString());
            try {
                if (type == Long.class) {
                    return exact.longValueExact();
                }
                if (type == Integer.class) {
                    return exact.intValueExact();
                }
                if (type == Short.class) {
                    return exact.shortValueExact();
                }
            } catch (ArithmeticException inexact) {
                throw new SQLException("CUBRID 값 " + exact + " 은 " + type.getName() + " 에 정확히 담기지 않는다", inexact);
            }
            if (type == BigDecimal.class) {
                return exact;
            }
            if (type == Double.class) {
                return number.doubleValue();
            }
        }
        if (value instanceof java.util.Date date) {
            Timestamp timestamp = new Timestamp(date.getTime());
            if (type == LocalDateTime.class) {
                return value instanceof Timestamp exact ? exact.toLocalDateTime() : timestamp.toLocalDateTime();
            }
            if (type == LocalDate.class) {
                return value instanceof java.sql.Date day ? day.toLocalDate() : timestamp.toLocalDateTime().toLocalDate();
            }
            if (type == LocalTime.class) {
                return value instanceof java.sql.Time time ? time.toLocalTime() : timestamp.toLocalDateTime().toLocalTime();
            }
            if (type == Instant.class) {
                return timestamp.toInstant();
            }
            if (type == OffsetDateTime.class) {
                return timestamp.toLocalDateTime().atZone(ZoneId.systemDefault()).toOffsetDateTime();
            }
        }
        if (type == UUID.class) {
            return UUID.fromString(value.toString());
        }
        throw new SQLException("CUBRID 값 " + value.getClass().getName() + " 을 " + type.getName() + " 로 읽을 수 없다");
    }

    private static Object call(Object target, Method method, Object[] args) throws Throwable {
        try {
            return method.invoke(target, args);
        } catch (InvocationTargetException failure) {
            throw failure.getCause();
        }
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, T target, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(CubridJdbcDataSource.class.getClassLoader(), new Class<?>[] {type}, (proxy, method, args) -> {
            // 드라이버 고유 객체(CUBRIDConnection 등)를 찾는 unwrap 은 원래 객체에 묻는다.
            if (method.getName().equals("unwrap") && args != null && args[0] instanceof Class<?> wanted) {
                return wanted.isInstance(proxy) ? proxy : call(target, method, args);
            }
            if (method.getName().equals("isWrapperFor") && args != null && args[0] instanceof Class<?> wanted) {
                return wanted.isInstance(proxy) || (Boolean) call(target, method, args);
            }
            if (method.getDeclaringClass() == Object.class) {
                return switch (method.getName()) {
                    case "equals" -> proxy == args[0];
                    case "hashCode" -> System.identityHashCode(proxy);
                    case "toString" -> "CubridJdbc(" + target + ")";
                    default -> call(target, method, args);
                };
            }
            return handler.invoke(proxy, method, args);
        });
    }
}
