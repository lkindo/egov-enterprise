package org.egovframe.rte.psl.dataaccess.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("EgovMap 유닛 테스트")
class EgovMapTest {

    @Test
    @DisplayName("SnakeCase를 CamelCase로 변환하여 put")
    void put_CamelCaseConversion() {
        // given
        EgovMap map = new EgovMap();

        // when
        map.put("USER_NAME", "홍길동");
        map.put("EMAIL_ADDRESS", "test@example.com");
        map.put("phone_number", "010-1234-5678");
        map.put("address", "Seoul");
        map.put(null, "null_value");

        // then
        assertThat(map.get("userName")).isEqualTo("홍길동");
        assertThat(map.get("emailAddress")).isEqualTo("test@example.com");
        assertThat(map.get("phoneNumber")).isEqualTo("010-1234-5678");
        assertThat(map.get("address")).isEqualTo("Seoul");
        assertThat(map.get(null)).isEqualTo("null_value");
    }

    @Test
    @DisplayName("이미 CamelCase인 경우 그대로 유지")
    void put_KeepCamelCase() {
        // given
        EgovMap map = new EgovMap();

        // when
        map.put("userName", "홍길동");

        // then
        assertThat(map.get("userName")).isEqualTo("홍길동");
    }

    @Test
    @DisplayName("연속된 언더바 처리")
    void put_ConsecutiveUnderscores() {
        // given
        EgovMap map = new EgovMap();

        // when
        map.put("USER__NAME", "홍길동");

        // then
        assertThat(map.get("userName")).isEqualTo("홍길동");
    }
}
