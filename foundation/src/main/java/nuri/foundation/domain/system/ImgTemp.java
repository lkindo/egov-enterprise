package nuri.foundation.domain.system;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "IMGTEMP")
public class ImgTemp extends BaseEntity {

    @EmbeddedId
    private ImgTempId id;

    @Column(name = "IMAGE_INFO", columnDefinition = "bytea")
    private byte[] imageInfo;

    @Column(name = "IMAGE_TY", length = 20)
    private String imageType;
}
