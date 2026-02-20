package egovframework.com.sym.prm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.prm.service.ProgrmManageDtlVO;
import egovframework.com.sym.prm.service.ProgrmManageVO;
/**
 * ?꾨줈洹몃옩 紐⑸줉愿由щ컦 ?꾨줈洹몃옩蹂寃쎄?由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         理쒖큹 ?앹꽦
 *
 * </pre>
 */

@Repository("progrmManageDAO")
public class ProgrmManageDAO extends EgovComAbstractDAO {

	/**
     * ?꾨줈洹몃옩 紐⑸줉??議고쉶
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     */
    public List<ProgrmManageVO> selectProgrmList(ComDefaultVO vo) throws Exception {
        return selectList("progrmManageDAO.selectProgrmList_D", vo);
    }

    /**
	 * ?꾨줈洹몃옩紐⑸줉 珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
    public int selectProgrmListTotCnt(ComDefaultVO vo) {
        return (Integer)selectOne("progrmManageDAO.selectProgrmListTotCnt_S", vo);
    }

	/**
	 * ?꾨줈洹몃옩 湲곕낯?뺣낫瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return ProgrmManageVO
	 * @exception Exception
	 */
	public ProgrmManageVO selectProgrm(ProgrmManageVO vo)throws Exception{
		return (ProgrmManageVO)selectOne("progrmManageDAO.selectProgrm_D", vo);
	}

	/**
	 * ?꾨줈洹몃옩 湲곕낯?뺣낫 諛?URL???깅줉
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	public void insertProgrm(ProgrmManageVO vo){
		insert("progrmManageDAO.insertProgrm_S", vo);
	}

	/**
	 * ?꾨줈洹몃옩 湲곕낯?뺣낫 諛?URL???섏젙
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	public void updateProgrm(ProgrmManageVO vo){
		update("progrmManageDAO.updateProgrm_S", vo);
	}

	/**
	 * ?꾨줈洹몃옩 湲곕낯?뺣낫 諛?URL????젣
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	public void deleteProgrm(ProgrmManageVO vo){
		delete("progrmManageDAO.deleteProgrm_S", vo);
	}

	/**
	 * ?꾨줈洹몃옩 ?뚯씪 議댁옱?щ?瑜?議고쉶
	 * @param vo ProgrmManageVO
	 * @return int
	 * @exception Exception
	 */
	public int selectProgrmNMTotCnt(ComDefaultVO vo) throws Exception{
		return (Integer)selectOne("progrmManageDAO.selectProgrmNMTotCnt", vo);
	}


	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?紐⑸줉??議고쉶
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */

	public List<ProgrmManageDtlVO> selectProgrmChangeRequstList(ComDefaultVO vo) throws Exception{
		return selectList("progrmManageDAO.selectProgrmChangeRequstList_D", vo);
	}

    /**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return  int
	 * @exception Exception
	 */
    public int selectProgrmChangeRequstListTotCnt(ComDefaultVO vo) {
        return (Integer)selectOne("progrmManageDAO.selectProgrmChangeRequstListTotCnt_S", vo);
    }

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥??뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	public ProgrmManageDtlVO selectProgrmChangeRequst(ProgrmManageDtlVO vo)throws Exception{
		return (ProgrmManageDtlVO)selectOne("progrmManageDAO.selectProgrmChangeRequst_D", vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ?깅줉
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	public void insertProgrmChangeRequst(ProgrmManageDtlVO vo){
		insert("progrmManageDAO.insertProgrmChangeRequst_S", vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ?섏젙
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	public void updateProgrmChangeRequst(ProgrmManageDtlVO vo){
		update("progrmManageDAO.updateProgrmChangeRequst_S", vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ??젣
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	public void deleteProgrmChangeRequst(ProgrmManageDtlVO vo){
		delete("progrmManageDAO.deleteProgrmChangeRequst_S", vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥??붿껌踰덊샇MAX ?뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	public ProgrmManageDtlVO selectProgrmChangeRequstNo(ProgrmManageDtlVO vo){
		return (ProgrmManageDtlVO)selectOne("progrmManageDAO.selectProgrmChangeRequstNo_D", vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?紐⑸줉??議고쉶
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	public List<?> selectChangeRequstProcessList(ComDefaultVO vo) throws Exception{
		return selectList("progrmManageDAO.selectChangeRequstProcessList_D", vo);
	}

    /**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
    public int selectChangeRequstListProcessTotCnt(ComDefaultVO vo) {
        return (Integer)selectOne("progrmManageDAO.selectChangeRequstProcessListTotCnt_S", vo);
    }

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?泥섎━ ?섏젙
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	public void updateProgrmChangeRequstProcess(ProgrmManageDtlVO vo){
		update("progrmManageDAO.updateProgrmChangeRequstProcess_S", vo);
	}


	/**
	 * ?꾨줈洹몃옩紐⑸줉 ?꾩껜??젣 珥덇린??
	 * @return boolean
	 * @exception Exception
	 */
	public boolean deleteAllProgrm(){
		ProgrmManageVO vo = new ProgrmManageVO();
		update("progrmManageDAO.deleteAllProgrm", vo);
		return true;
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎈궡???꾩껜??젣 珥덇린??
	 * @return boolean
	 * @exception Exception
	 */
	public boolean deleteAllProgrmDtls(){
		ProgrmManageDtlVO vo = new ProgrmManageDtlVO();
		update("progrmManageDAO.deleteAllProgrmDtls", vo);
		return true;
	}

    /**
	 * ?꾨줈洹몃옩紐⑸줉 ?곗씠? 議댁옱?щ? 議고쉶?쒕떎.
	 * @return int
	 * @exception Exception
	 */
    public int selectProgrmListTotCnt() {
    	ProgrmManageVO vo = new ProgrmManageVO();
        return (Integer)selectOne("progrmManageDAO.selectProgrmListTotCnt", vo);
    }

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?옄 Email ?뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	public ProgrmManageDtlVO selectRqesterEmail(ProgrmManageDtlVO vo){
		return (ProgrmManageDtlVO)selectOne("progrmManageDAO.selectRqesterEmail", vo);
	}
}