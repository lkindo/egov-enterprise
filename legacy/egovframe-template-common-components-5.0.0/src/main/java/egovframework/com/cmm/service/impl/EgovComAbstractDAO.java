**
 *
 */
package egovframework.com.cmm.service.impl;

import org.apache.ibatis.session.SqlSessionFactory;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;

import jakarta.annotation.Resource;

/**
 * EgovComAbstractDAO.java ?대옒??
 *
 * @author ?쒖???
 * @since 2011. 9. 23.
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2011.09.23  ?쒖???         理쒖큹 ?앹꽦
 *   2016.05.11  ?λ룞??         myBatis 諛⑹떇 ?곸슜
 *   2025.05.27  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 * 
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    -------------    ----------------------
 * 
 *      </pre>
 */
public abstract class EgovComAbstractDAO extends EgovAbstractMapper {

	@Override
	@Resource(name = "egov.sqlSession")
	public void setSqlSessionFactory(SqlSessionFactory sqlSession) {
		super.setSqlSessionFactory(sqlSession);
	}

}
