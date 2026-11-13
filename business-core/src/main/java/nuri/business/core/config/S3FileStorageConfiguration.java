package nuri.business.core.config;

import nuri.business.service.file.S3FileStorageService;
import nuri.foundation.core.storage.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;

/**
 * 첨부 저장소를 S3 호환 오브젝트 저장소로 바꾸는 프로필(Wave 4). {@code file.storage.type=s3} 일 때만 켜진다 — 기본({@code local}·
 * 값 없음)은 로컬 파일 저장소 그대로다. 멀티 노드 배포에서 노드끼리 첨부 볼륨을 나누지 않아도 되게 한다.
 * 설정이 비거나 틀리면 기동을 멈춘다(조용히 로컬로 떨어지지 않는다). 비밀 키 값은 로그·예외에 담지 않는다.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "file.storage", name = "type", havingValue = "s3")
public class S3FileStorageConfiguration {

    @Bean
    public FileStorageService s3FileStorageService(
            @Value("${file.storage.s3.endpoint:}") String endpoint,
            @Value("${file.storage.s3.region:}") String region,
            @Value("${file.storage.s3.bucket:}") String bucket,
            @Value("${file.storage.s3.access-key:}") String accessKey,
            @Value("${file.storage.s3.secret-key:}") String secretKey,
            @Value("${file.storage.s3.prefix:}") String prefix,
            @Value("${file.storage.s3.path-style:true}") boolean pathStyle) {
        var settings = new S3FileStorageService.Settings(endpoint, region, bucket, accessKey, secretKey, prefix, pathStyle);
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        return new S3FileStorageService(settings, http, Clock.systemDefaultZone());
    }
}
