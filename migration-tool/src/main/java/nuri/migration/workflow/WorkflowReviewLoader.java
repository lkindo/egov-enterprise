package nuri.migration.workflow;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.artifact.ArtifactRedactionGuard;

import java.io.IOException;
import java.util.Objects;

/** duplicate/unknown field를 허용하지 않는 review YAML loader. */
public final class WorkflowReviewLoader {

    private final YAMLMapper yaml = YAMLMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .build();

    public WorkflowReview load(byte[] content) {
        Objects.requireNonNull(content, "content");
        try {
            WorkflowReview review = yaml.readValue(content, WorkflowReview.class);
            ArtifactRedactionGuard.assertSafe(yaml.valueToTree(review));
            return review;
        } catch (IOException failure) {
            throw new IllegalArgumentException("workflow review YAML parsing failed");
        }
    }
}
