package com.company.project.domain.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "NBLOGUSER")
@IdClass(BlogUserId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BlogUser {

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

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;
}

@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
class BlogUserId implements Serializable {
    private String blogId;
    private String emplyrId;
}
