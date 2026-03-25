package com.company.project.foundation.domain.system;
import com.company.project.foundation.domain.common.BaseEntity;
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

    @Lob
    @Column(name = "IMAGE_INFO")
    private byte[] imageInfo;

    @Column(name = "IMAGE_TY", length = 20)
    private String imageType;
}
