package com.company.project.business.domain.file;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QFileDetail is a Querydsl query type for FileDetail
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileDetail extends EntityPathBase<FileDetail> {

    private static final long serialVersionUID = -867598384L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QFileDetail fileDetail = new QFileDetail("fileDetail");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath fileCn = createString("fileCn");

    public final StringPath fileExtsn = createString("fileExtsn");

    public final QFileMaster fileMaster;

    public final NumberPath<Long> fileMg = createNumber("fileMg", Long.class);

    public final NumberPath<Integer> fileSn = createNumber("fileSn", Integer.class);

    public final StringPath fileStreCours = createString("fileStreCours");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath orignlFileNm = createString("orignlFileNm");

    public final StringPath streFileNm = createString("streFileNm");

    public QFileDetail(String variable) {
        this(FileDetail.class, forVariable(variable), INITS);
    }

    public QFileDetail(Path<? extends FileDetail> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QFileDetail(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QFileDetail(PathMetadata metadata, PathInits inits) {
        this(FileDetail.class, metadata, inits);
    }

    public QFileDetail(Class<? extends FileDetail> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.fileMaster = inits.isInitialized("fileMaster") ? new QFileMaster(forProperty("fileMaster")) : null;
    }

}

