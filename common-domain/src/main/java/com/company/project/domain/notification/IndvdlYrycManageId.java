package com.company.project.domain.notification;

import java.io.Serializable;
import java.util.Objects;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
public class IndvdlYrycManageId implements Serializable {
    private String occrrncYear;
    private String userId;

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        IndvdlYrycManageId that = (IndvdlYrycManageId) o;
        return Objects.equals(occrrncYear, that.occrrncYear) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(occrrncYear, userId);
    }
}
