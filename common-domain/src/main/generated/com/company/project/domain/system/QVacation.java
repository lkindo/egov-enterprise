package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QVacation is a Querydsl query type for Vacation
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QVacation extends EntityPathBase<Vacation> {

    private static final long serialVersionUID = 1806443973L;

    public static final QVacation vacation = new QVacation("vacation");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath applcntId = createString("applcntId");

    public final StringPath bgnde = createString("bgnde");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath endde = createString("endde");

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath noonSe = createString("noonSe");

    public final StringPath occrrncYear = createString("occrrncYear");

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final StringPath sanctnDt = createString("sanctnDt");

    public final StringPath sanctnerId = createString("sanctnerId");

    public final StringPath vcatnResn = createString("vcatnResn");

    public final StringPath vcatnSe = createString("vcatnSe");

    public QVacation(String variable) {
        super(Vacation.class, forVariable(variable));
    }

    public QVacation(Path<? extends Vacation> path) {
        super(path.getType(), path.getMetadata());
    }

    public QVacation(PathMetadata metadata) {
        super(Vacation.class, metadata);
    }

}
