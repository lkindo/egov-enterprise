package nuri.migration;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 대상 schema 의 빈 표준 메타(meta_standard_terms·meta_standard_domains, V2_128 의 확장 컬럼 포함). 원장의 비표준 대상
 * 확정(DEC-OPS-317 U1)은 live 메타에 그 컬럼의 용어가 없다는 증명이 필요하다 — 메타가 없으면 증명할 수 없어 멈춘다.
 */
final class StandardMetaFixture {

    private StandardMetaFixture() {
    }

    static void create(JdbcTemplate target, String schema) {
        target.execute("CREATE TABLE IF NOT EXISTS " + schema + ".meta_standard_domains (domain_name varchar(100),"
                + " data_type varchar(50), data_length integer)");
        target.execute("CREATE TABLE IF NOT EXISTS " + schema + ".meta_standard_terms (term_name varchar(255),"
                + " eng_abbr varchar(100), domain_name varchar(100), deprecated_yn varchar(1) NOT NULL DEFAULT 'N',"
                + " allowed_values text)");
    }
}
