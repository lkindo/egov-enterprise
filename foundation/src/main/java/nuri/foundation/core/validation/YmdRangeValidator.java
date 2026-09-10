package nuri.foundation.core.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.BeanWrapperImpl;
import java.util.regex.Pattern;

public final class YmdRangeValidator implements ConstraintValidator<YmdRange, Object> {
    private static final Pattern DATE = Pattern.compile(Ymd.OPTIONAL_PATTERN);
    private String start;
    private String end;

    @Override
    public void initialize(YmdRange constraint) {
        start = constraint.start();
        end = constraint.end();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (value == null) return true;
        var bean = new BeanWrapperImpl(value);
        String from = (String) bean.getPropertyValue(start);
        String to = (String) bean.getPropertyValue(end);
        // Field constraints report invalid dates; don't add a misleading range error.
        if (from == null || to == null || from.isEmpty() || to.isEmpty()
                || !DATE.matcher(from).matches() || !DATE.matcher(to).matches()
                || from.compareTo(to) <= 0) return true;
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode(end).addConstraintViolation();
        return false;
    }
}
