package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QNtwrk is a Querydsl query type for Ntwrk
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNtwrk extends EntityPathBase<Ntwrk> {

    private static final long serialVersionUID = -1899116670L;

    public static final QNtwrk ntwrk = new QNtwrk("ntwrk");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath domnServer = createString("domnServer");

    public final StringPath gtwy = createString("gtwy");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath manageIem = createString("manageIem");

    public final StringPath ntwrkId = createString("ntwrkId");

    public final StringPath ntwrkIp = createString("ntwrkIp");

    public final DatePath<java.time.LocalDate> regstYmd = createDate("regstYmd", java.time.LocalDate.class);

    public final StringPath subnet = createString("subnet");

    public final StringPath useAt = createString("useAt");

    public final StringPath userNm = createString("userNm");

    public QNtwrk(String variable) {
        super(Ntwrk.class, forVariable(variable));
    }

    public QNtwrk(Path<? extends Ntwrk> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNtwrk(PathMetadata metadata) {
        super(Ntwrk.class, metadata);
    }

}