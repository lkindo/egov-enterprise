package egovframework.com.cmm.service.impl;

import org.apache.ibatis.session.SqlSessionFactory;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;

import jakarta.annotation.Resource;

/**
 * EgovComAbstractDAO.java ?????
 *
 * @author ?????
 * @since 2011. 9. 23.
 * @version 1.0
 **/
public abstract class EgovComAbstractDAO extends EgovAbstractMapper {

    @Override
    @Resource(name = "egov.sqlSession")
    public void setSqlSessionFactory(SqlSessionFactory sqlSession) {
        super.setSqlSessionFactory(sqlSession);
    }

}
