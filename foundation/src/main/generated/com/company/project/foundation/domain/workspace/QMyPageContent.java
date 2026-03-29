package com.company.project.foundation.domain.workspace;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMyPageContent is a Querydsl query type for MyPageContent
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMyPageContent extends EntityPathBase<MyPageContent> {

    private static final long serialVersionUID = -756306077L;

    public static final QMyPageContent myPageContent = new QMyPageContent("myPageContent");

    public final StringPath cntcUrl = createString("cntcUrl");

    public final StringPath cntntsDc = createString("cntntsDc");

    public final StringPath cntntsId = createString("cntntsId");

    public final StringPath cntntsLinkUrl = createString("cntntsLinkUrl");

    public final StringPath cntntsNm = createString("cntntsNm");

    public final StringPath cntntsUseAt = createString("cntntsUseAt");

    public QMyPageContent(String variable) {
        super(MyPageContent.class, forVariable(variable));
    }

    public QMyPageContent(Path<? extends MyPageContent> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMyPageContent(PathMetadata metadata) {
        super(MyPageContent.class, metadata);
    }

}

