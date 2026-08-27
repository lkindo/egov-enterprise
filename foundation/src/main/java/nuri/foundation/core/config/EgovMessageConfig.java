package nuri.foundation.core.config;

import jakarta.validation.MessageInterpolator;
import org.hibernate.validator.messageinterpolation.ResourceBundleMessageInterpolator;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.validation.beanvalidation.MessageSourceResourceBundleLocator;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

@Configuration
public class EgovMessageConfig {

    /** 응답 메시지가 지원하는 로케일. 이 목록 밖의 Accept-Language 는 첫 번째 값으로 수렴한다. */
    private static final List<Locale> SUPPORTED_LOCALES = List.of(Locale.KOREAN, Locale.ENGLISH);

    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource();
        messageSource.setBasenames(
                "classpath:/egovframework/message/messages",
                // 아래 두 basename 은 eGovFrame 표준 모듈을 채택하는 파생 제품용 **선택 확장점**이다.
                // 이 저장소에는 실물 파일이 없고, ReloadableResourceBundleMessageSource 는 없는
                // basename 을 조용히 건너뛴다. 파일을 추가하면 그 시점부터 자동으로 병합된다.
                "classpath:/egovframework/message/com/message-common",
                "classpath:/egovframework/message/com/message-validation");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setCacheSeconds(60);
        // 지원하지 않는 로케일(예: Accept-Language: fr) 요청이 **JVM 시스템 로케일**로 새지 않게 한다.
        // 종전 기본값(fallbackToSystemLocale=true)에서는 같은 요청이 개발 PC(ko_KR)에서는 한국어,
        // CI/운영 리눅스(en_US)에서는 영어로 갈려 응답 언어가 실행 환경에 의존했다.
        messageSource.setFallbackToSystemLocale(false);
        messageSource.setDefaultLocale(Locale.KOREAN);
        return messageSource;
    }

    /**
     * Bean Validation(@NotBlank·@Size 등)의 {@code message = "{키}"} 보간을 위 MessageSource 로 연결한다.
     *
     * <p>이 빈이 없으면 Hibernate Validator 는 클래스패스의 {@code ValidationMessages.properties} 만
     * 뒤지는데 저장소에 그 파일이 없어, {@code @NotBlank(message = "{validation.required}")} 같은
     * 선언이 해석되지 못하고 <b>중괄호를 포함한 키 문자열이 그대로 사용자에게 노출</b>된다.
     * 응답의 {@code message} 와 {@code fieldErrors[].field} 를 화면이 그대로 보여주므로 사용자에게 보이는 결함이다.
     *
     * <p>Spring Boot 의 {@code ValidationAutoConfiguration#defaultValidator} 는
     * {@code @ConditionalOnMissingBean(Validator.class)} 이므로 이 빈이 우선한다.
     */
    @Bean
    public LocalValidatorFactoryBean defaultValidator() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.setMessageInterpolator(new LocaleContextMessageInterpolator(
                new ResourceBundleMessageInterpolator(new MessageSourceResourceBundleLocator(messageSource()))));
        return validator;
    }

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(Locale.KOREAN);
        // 지원 목록을 비워 두면 Accept-Language 값이 그대로 해석 로케일이 되어, 번들이 없는 로케일이
        // MessageSource 폴백 사슬로 흘러든다. 여기서 미리 ko/en 으로 수렴시켜 응답 언어를 결정적으로 만든다.
        localeResolver.setSupportedLocales(SUPPORTED_LOCALES);
        return localeResolver;
    }

    /**
     * Bean Validation 메시지를 **요청 로케일**로 보간한다.
     *
     * <p>Hibernate Validator 의 기본 보간기는 {@link Locale#getDefault()} 를 쓴다. 운영 컨테이너는
     * {@code -Duser.language} 를 지정하지 않으므로(api-server/Dockerfile) JVM 기본 로케일이 영어가 되고,
     * 그러면 ErrorCode 메시지는 Accept-Language 대로 한국어인데 <b>검증 메시지만 영어</b>로 나가
     * 한 응답 안에서 언어가 갈린다. 요청 로케일을 따르게 해 ADR-0002(한국어 우선 + ko/en 계약)를 유지한다.
     */
    static final class LocaleContextMessageInterpolator implements MessageInterpolator {

        private final MessageInterpolator delegate;

        LocaleContextMessageInterpolator(MessageInterpolator delegate) {
            this.delegate = delegate;
        }

        @Override
        public String interpolate(String messageTemplate, Context context) {
            return delegate.interpolate(messageTemplate, context, LocaleContextHolder.getLocale());
        }

        @Override
        public String interpolate(String messageTemplate, Context context, Locale locale) {
            return delegate.interpolate(messageTemplate, context, locale);
        }
    }
}
