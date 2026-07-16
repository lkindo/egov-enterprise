package nuri.business.domain.board;
import nuri.foundation.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_bbs_use_info")
@IdClass(BoardUseId.class)
public class BoardUse extends BaseTimeEntity implements Serializable {

    @Id
    @Column(length = 20)
    private String bbsId;

    @Id
    @Column(length = 20)
    private String trgtId;

    @Column(length = 12)
    private String rgstrSeCd;

    @Column(length = 1)
    private String useYn;

    // [Phase 5.2] 빌더는 클래스 레벨 대신 커스텀 생성자에 배치 (BoardUse.builder()...build() 유지)
    @Builder
    public BoardUse(String bbsId, String trgtId, String rgstrSeCd, String useYn) {
        this.bbsId = bbsId;
        this.trgtId = trgtId;
        this.rgstrSeCd = rgstrSeCd;
        this.useYn = useYn;
    }


    public void update(String useYn) {
        this.useYn = useYn;
    }


}
