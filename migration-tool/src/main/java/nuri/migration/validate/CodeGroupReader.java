package nuri.migration.validate;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;

/**
 * [ADR-0029 L4 D7] 대상 schema 의 공통코드 그룹을 읽는다. 결과에는 요청한 그룹이 모두 있다 — 헤더가 없는 그룹은
 * {@link CodeGroupState#absent()} 다. 표·권한이 없으면 {@link SQLException} 을 그대로 던지고, 호출자가 게이트로 바꾼다.
 */
@FunctionalInterface
public interface CodeGroupReader {

    Map<String, CodeGroupState> read(Connection connection, String schema, Set<String> groups) throws SQLException;
}
