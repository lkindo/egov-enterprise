package com.company.project.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import java.io.Serializable;
import java.time.LocalDateTime;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NBLOGUSER")
@IdClass(BlogUserId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class BlogUser extends BaseEntity {

    @Id
    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "MNGR_AT", length = 1)
    private String mngrAt;

    @Column(name = "SBSCRB_DE")
    private LocalDateTime sbscrbDe;

    @Column(name = "SECSN_DE")
    private LocalDateTime secsnDe;

    @Column(name = "MBER_STTUS", length = 1)
    private String mberSttus;

    @Column(name = "USE_AT", length = 1)
    private String useAt;
}

@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Getter
@SuperBuilder
class BlogUserId implements Serializable {
    private String blogId;
    private String emplyrId;
}
