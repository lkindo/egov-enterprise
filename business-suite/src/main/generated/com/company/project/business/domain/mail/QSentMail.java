package com.company.project.business.domain.mail;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSentMail is a Querydsl query type for SentMail
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSentMail extends EntityPathBase<SentMail> {

    private static final long serialVersionUID = -1780240585L;

    public static final QSentMail sentMail = new QSentMail("sentMail");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath dsptchPerson = createString("dsptchPerson");

    public final StringPath emailCn = createString("emailCn");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath mssageId = createString("mssageId");

    public final StringPath recptnPerson = createString("recptnPerson");

    public final StringPath sj = createString("sj");

    public final StringPath sndngDe = createString("sndngDe");

    public final StringPath sndngResultCode = createString("sndngResultCode");

    public QSentMail(String variable) {
        super(SentMail.class, forVariable(variable));
    }

    public QSentMail(Path<? extends SentMail> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSentMail(PathMetadata metadata) {
        super(SentMail.class, metadata);
    }

}

