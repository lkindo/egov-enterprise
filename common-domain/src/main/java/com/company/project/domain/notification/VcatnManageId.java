package com.company.project.domain.notification;

import java.io.Serializable;
import java.util.Objects;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
public class VcatnManageId implements Serializable {
    private String applcntId;
    private String vcatnSe;
    private String bgnde;

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        VcatnManageId that = (VcatnManageId) o;
        return Objects.equals(applcntId, that.applcntId) && Objects.equals(vcatnSe, that.vcatnSe)
                && Objects.equals(bgnde, that.bgnde);
    }

    @Override
    public int hashCode() {
        return Objects.hash(applcntId, vcatnSe, bgnde);
    }
}
