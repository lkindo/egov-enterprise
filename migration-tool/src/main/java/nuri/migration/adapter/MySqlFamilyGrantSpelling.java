package nuri.migration.adapter;

/**
 * MySQL·MariaDB SCHEMA_PRIVILEGES의 grant 철자 규칙만 공유한다.
 * 두 vendor는 TABLE_SCHEMA의 literal pattern escape와 'user'@'host' GRANTEE 철자를 같게 쓴다.
 * 가시성 SQL·partial_revokes·CURRENT_ROLE·catalog·driver 확인은 vendor별 proof에 남긴다.
 */
final class MySqlFamilyGrantSpelling {

    private MySqlFamilyGrantSpelling() {}

    static String literalGrantSchema(String schema) {
        StringBuilder pattern = new StringBuilder(schema.length());
        for (int index = 0; index < schema.length(); index++) {
            char character = schema.charAt(index);
            if (character == '\\' || character == '_' || character == '%') {
                pattern.append('\\');
            }
            pattern.append(character);
        }
        return pattern.toString();
    }

    static boolean matchesAccount(String account, String grantee) {
        if (account == null || grantee == null) {
            return false;
        }
        int separator = account.indexOf('@');
        if (separator <= 0 || separator != account.lastIndexOf('@')) {
            return false;
        }
        String user = account.substring(0, separator);
        String host = account.substring(separator + 1);
        // Complex quoted or ambiguous identities are not qualified by this narrowly exercised account route.
        return user.matches("[A-Za-z0-9_]+") && host.matches("[A-Za-z0-9_.:%-]+")
                && grantee.equals("'" + user + "'@'" + host + "'");
    }
}
