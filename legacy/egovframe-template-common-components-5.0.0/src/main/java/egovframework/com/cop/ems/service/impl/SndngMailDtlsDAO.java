package egovframework.com.cop.ems.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.ems.service.SndngMailVO;

/**
 * 諛쒖넚硫붿씪 ?댁뿭??議고쉶?섎뒗 DAO ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??        ?섏젙??      ?섏젙?댁슜
 *  ----------    --------    ---------------------------
 *  2009.03.12     諛뺤???      理쒖큹 ?앹꽦
 *
 *      </pre>
 */
@Repository("sndngMailDtlsDAO")
public class SndngMailDtlsDAO extends EgovComAbstractDAO {

	/**
	 * 諛쒖넚硫붿씪 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	public List<SndngMailVO> selectSndngMailList(ComDefaultVO vo) throws Exception {
		return selectList("SndngMailDtlsDAO.selectSndngMailList_D", vo);
	}

	/**
	 * 諛쒖넚硫붿씪 珥앷굔?섎? 議고쉶?쒕떎.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception
	 */
	public int selectSndngMailListTotCnt(ComDefaultVO vo) {
		return (Integer) selectOne("SndngMailDtlsDAO.selectSndngMailListTotCnt_S", vo);
	}
}
