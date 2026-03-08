package com.company.project.domain.community;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CommunityUserId implements Serializable {

    @Column(name = "CMMNTY_ID", length = 20, nullable = false)
    private String cmmntyId;

    @Column(name = "EMPLYR_ID", length = 20, nullable = false)
    private String emplyrId;
}
