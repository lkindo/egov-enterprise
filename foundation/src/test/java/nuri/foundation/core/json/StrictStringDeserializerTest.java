package nuri.foundation.core.json;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StrictStringDeserializerTest {
    private final JsonMapper mapper = JsonMapper.builder().build();

    record Request(@JsonDeserialize(using = StrictStringDeserializer.class) String value) {}

    @ParameterizedTest
    @ValueSource(strings = {"1", "100.0", "true", "false", "{}", "[]", "[\"100\"]"})
    void nonStringValuesAreNeverCoerced(String raw) {
        assertThatThrownBy(() -> mapper.readValue("{\"value\":" + raw + "}", Request.class))
                .isInstanceOf(MismatchedInputException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "100", " 100 ", "0100", "1e3", "100\n"})
    void stringsArePreservedVerbatimForTheDomainValidator(String value) {
        Request parsed = mapper.readValue("{\"value\":" + mapper.writeValueAsString(value) + "}", Request.class);
        assertThat(parsed.value()).isEqualTo(value);
    }

    @Test
    void nullAndOmissionRetainNull() {
        assertThat(mapper.readValue("{\"value\":null}", Request.class).value()).isNull();
        assertThat(mapper.readValue("{}", Request.class).value()).isNull();
    }
}
