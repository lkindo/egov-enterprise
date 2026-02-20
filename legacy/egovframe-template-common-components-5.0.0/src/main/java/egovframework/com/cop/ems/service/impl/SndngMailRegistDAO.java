package egovframework.com.cop.ems.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.ems.service.AtchmnFileVO;
import egovframework.com.cop.ems.service.SndngMailVO;

/**
 * 諛쒖넚硫붿씪???깅줉?섎뒗 DAO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.12  諛뺤???         理쒖큹 ?앹꽦
 *
 *  </pre>
 */
@Repository("sndngMailRegistDAO")
public class SndngMailRegistDAO extends EgovComAbstractDAO {

	/**
	 * 諛쒖넚??硫붿씪???깅줉?쒕떎
	 * @param vo SndngMailVO
	 * @return SndngMailVO
	 * @exception Exception
	 */
	public SndngMailVO insertSndngMail(SndngMailVO vo) throws Exception {
		insert("sndngMailRegistDAO.insertSndngMail", vo);
		return new SndngMailVO() ;
	}

	/**
	 * 諛쒖넚??硫붿씪???덈뒗 泥⑤??뚯씪 紐⑸줉??議고쉶?쒕떎.
	 * @param vo SndngMailVO
	 * @return List
	 * @exception Exception
	 */
	public List<AtchmnFileVO> selectAtchmnFileList(SndngMailVO vo) throws Exception {
		return selectList("sndngMailRegistDAO.selectAtchmnFileList", vo);
	}

	/**
	 * 諛쒖넚寃곌낵瑜??섏젙?쒕떎.
	 * @param vo SndngMailVO
	 * @return SndngMailVO
	 * @exception Exception
	 */
	public SndngMailVO updateSndngMail(SndngMailVO vo) throws Exception {
		update("sndngMailRegistDAO.updateSndngMail", vo);
		return new SndngMailVO();
	}
}
