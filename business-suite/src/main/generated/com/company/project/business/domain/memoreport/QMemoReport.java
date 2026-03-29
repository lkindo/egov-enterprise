package com.company.project.business.domain.memoreport;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMemoReport is a Querydsl query type for MemoReport
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMemoReport extends EntityPathBase<MemoReport> {

    private static final long serialVersionUID = 1812146303L;

    public static final QMemoReport memoReport = new QMemoReport("memoReport");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath drctMatter = createString("drctMatter");

    public final StringPath drctMatterRegistDt = createString("drctMatterRegistDt");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath reportCn = createString("reportCn");

    public final StringPath reportDe = createString("reportDe");

    public final StringPath reportrId = createString("reportrId");

    public final StringPath reportrInqireDt = createString("reportrInqireDt");

    public final StringPath reprtId = createString("reprtId");

    public final StringPath reprtSj = createString("reprtSj");

    public final StringPath wrterId = createString("wrterId");

    public QMemoReport(String variable) {
        super(MemoReport.class, forVariable(variable));
    }

    public QMemoReport(Path<? extends MemoReport> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMemoReport(PathMetadata metadata) {
        super(MemoReport.class, metadata);
    }

}

