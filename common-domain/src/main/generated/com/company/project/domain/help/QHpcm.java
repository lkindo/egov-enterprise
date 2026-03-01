package com.company.project.domain.help;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QHpcm is a Querydsl query type for Hpcm
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QHpcm extends EntityPathBase<Hpcm> {

    private static final long serialVersionUID = 180368072L;

    public static final QHpcm hpcm = new QHpcm("hpcm");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath hpcmDc = createString("hpcmDc");

    public final StringPath hpcmDf = createString("hpcmDf");

    public final StringPath hpcmId = createString("hpcmId");

    public final StringPath hpcmSeCode = createString("hpcmSeCode");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public QHpcm(String variable) {
        super(Hpcm.class, forVariable(variable));
    }

    public QHpcm(Path<? extends Hpcm> path) {
        super(path.getType(), path.getMetadata());
    }

    public QHpcm(PathMetadata metadata) {
        super(Hpcm.class, metadata);
    }

}
