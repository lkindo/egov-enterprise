package com.company.project.domain.dam;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QProfessional is a Querydsl query type for Professional
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProfessional extends EntityPathBase<Professional> {

    private static final long serialVersionUID = -2138241252L;

    public static final QProfessional professional = new QProfessional("professional");

    public final StringPath appTypeCd = createString("appTypeCd");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath knoTypeCd = createString("knoTypeCd");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath speConfmDe = createString("speConfmDe");

    public final StringPath speExpCn = createString("speExpCn");

    public final StringPath speId = createString("speId");

    public QProfessional(String variable) {
        super(Professional.class, forVariable(variable));
    }

    public QProfessional(Path<? extends Professional> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProfessional(PathMetadata metadata) {
        super(Professional.class, metadata);
    }

}
