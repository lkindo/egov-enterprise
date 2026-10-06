package nuri.migration.adapter;

import java.util.Locale;

/** JDBC metadata와 vendor catalog discovery가 공유하는 시스템 스키마 판정. */
final class SystemSchemas {

    private SystemSchemas() {}

    static boolean isSystem(String schema) {
        if (schema == null) {
            return false;
        }
        String normalized = schema.toUpperCase(Locale.ROOT);
        return normalized.equals("INFORMATION_SCHEMA")
                || normalized.equals("PG_CATALOG")
                || normalized.startsWith("PG_TOAST")
                || normalized.startsWith("PG_TEMP")
                || normalized.equals("SYS")
                || normalized.equals("SYSTEM")
                || normalized.equals("MYSQL")
                || normalized.equals("PERFORMANCE_SCHEMA");
    }
}
