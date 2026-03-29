package com.company.project.business.domain.file;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QFileMaster is a Querydsl query type for FileMaster
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileMaster extends EntityPathBase<FileMaster> {

    private static final long serialVersionUID = -613641759L;

    public static final QFileMaster fileMaster = new QFileMaster("fileMaster");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final ListPath<FileDetail, QFileDetail> fileDetails = this.<FileDetail, QFileDetail>createList("fileDetails", FileDetail.class, QFileDetail.class, PathInits.DIRECT2);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath useAt = createString("useAt");

    public QFileMaster(String variable) {
        super(FileMaster.class, forVariable(variable));
    }

    public QFileMaster(Path<? extends FileMaster> path) {
        super(path.getType(), path.getMetadata());
    }

    public QFileMaster(PathMetadata metadata) {
        super(FileMaster.class, metadata);
    }

}

