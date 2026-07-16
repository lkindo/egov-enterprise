package nuri.business.domain.auth;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 역할 ↔ 프로그램 매핑의 복합 기본 키 클래스.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RoleProgramMapId implements Serializable {
    private static final long serialVersionUID = 1L;

    private String roleId;
    private String prgrmFileNm;
}
