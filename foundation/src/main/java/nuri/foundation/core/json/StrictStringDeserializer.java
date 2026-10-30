package nuri.foundation.core.json;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/** 문자열 원문이 계약인 요청 필드에서만 숫자·boolean 등의 암묵적 문자열 변환을 막는다. */
public final class StrictStringDeserializer extends ValueDeserializer<String> {
    @Override
    public String deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
        if (parser.hasToken(JsonToken.VALUE_STRING)) {
            return parser.getString();
        }
        return context.reportInputMismatch(String.class, "JSON 문자열 또는 null만 입력할 수 있습니다.");
    }
}
