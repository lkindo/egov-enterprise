package egovframework.com.sym.prm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.prm.service.EgovProgrmManageService;
import egovframework.com.sym.prm.service.ProgrmManageDtlVO;
import egovframework.com.sym.prm.service.ProgrmManageVO;
import jakarta.annotation.Resource;

/**
 * ?꾨줈洹몃옩紐⑸줉愿由?諛??꾨줈洹몃옩蹂寃쎄?由ъ뿉 愿??鍮꾩쫰?덉뒪 援ы쁽 ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("progrmManageService")
public class EgovProgrmManageServiceImpl extends EgovAbstractServiceImpl implements EgovProgrmManageService {

	@Resource(name="progrmManageDAO")
    private ProgrmManageDAO progrmManageDAO;


	/**
	 * ?꾨줈洹몃옩 ?곸꽭?뺣낫瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageVO selectProgrm(ProgrmManageVO vo) throws Exception{
         	return progrmManageDAO.selectProgrm(vo);
	}
	
	/**
     * ?꾨줈洹몃옩 紐⑸줉??議고쉶
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     */
    @Override
    public List<ProgrmManageVO> selectProgrmList(ComDefaultVO vo) throws Exception {
        return progrmManageDAO.selectProgrmList(vo);
    }
    
	/**
	 * ?꾨줈洹몃옩紐⑸줉 珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo  ComDefaultVO
	 * @return Integer
	 * @exception Exception
	 */
    @Override
	public int selectProgrmListTotCnt(ComDefaultVO vo) throws Exception {
        return progrmManageDAO.selectProgrmListTotCnt(vo);
	}
	/**
	 * ?꾨줈洹몃옩 ?뺣낫瑜??깅줉
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	public void insertProgrm(ProgrmManageVO vo) throws Exception {
    	try {
			progrmManageDAO.insertProgrm(vo);
		} catch (DuplicateKeyException e) {
			throw new DuplicateKeyException("?대? ?깅줉???꾨줈洹몃옩?뚯씪紐낆엯?덈떎.", e);
		}
	}

	/**
	 * ?꾨줈洹몃옩 ?뺣낫瑜??섏젙
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	public void updateProgrm(ProgrmManageVO vo) throws Exception {
    	progrmManageDAO.updateProgrm(vo);
	}

	/**
	 * ?꾨줈洹몃옩 ?뺣낫瑜???젣
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	public void deleteProgrm(ProgrmManageVO vo) throws Exception {
    	progrmManageDAO.deleteProgrm(vo);
	}

	/**
	 * ?꾨줈洹몃옩 ?뚯씪 議댁옱?щ?瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectProgrmNMTotCnt(ComDefaultVO vo) throws Exception{
		return progrmManageDAO.selectProgrmNMTotCnt(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥??뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageDtlVO selectProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception{
       	return progrmManageDAO.selectProgrmChangeRequst(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?紐⑸줉??議고쉶
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<ProgrmManageDtlVO> selectProgrmChangeRequstList(ComDefaultVO vo) throws Exception {
   		return progrmManageDAO.selectProgrmChangeRequstList(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?ぉ濡?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
    @Override
	public int selectProgrmChangeRequstListTotCnt(ComDefaultVO vo) throws Exception {
        return progrmManageDAO.selectProgrmChangeRequstListTotCnt(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ?깅줉
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public void insertProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
    	progrmManageDAO.insertProgrmChangeRequst(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ?섏젙
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public void updateProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
    	progrmManageDAO.updateProgrmChangeRequst(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ??젣
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public void deleteProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
    	progrmManageDAO.deleteProgrmChangeRequst(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥??붿껌踰덊샇MAX ?뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageDtlVO selectProgrmChangeRequstNo(ProgrmManageDtlVO vo) throws Exception {
   		return progrmManageDAO.selectProgrmChangeRequstNo(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由?紐⑸줉??議고쉶
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<?> selectChangeRequstProcessList(ComDefaultVO vo) throws Exception {
   		return progrmManageDAO.selectChangeRequstProcessList(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由щぉ濡?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
    @Override
	public int selectChangeRequstProcessListTotCnt(ComDefaultVO vo) throws Exception {
        return progrmManageDAO.selectChangeRequstListProcessTotCnt(vo);
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由щ? ?섏젙
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public void updateProgrmChangeRequstProcess(ProgrmManageDtlVO vo) throws Exception {
    	progrmManageDAO.updateProgrmChangeRequstProcess(vo);
	}

	/**
	 * ?붾㈃??議고쉶??硫붾돱 紐⑸줉 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedProgrmFileNmForDel String
	 * @exception Exception
	 */
	@Override
	public void deleteProgrmManageList(String checkedProgrmFileNmForDel) throws Exception {
		ProgrmManageVO vo = null;
		String [] delProgrmFileNm = checkedProgrmFileNmForDel.split(",");
		for (String element : delProgrmFileNm) {
			vo = new ProgrmManageVO();
			vo.setProgrmFileNm(element);
			progrmManageDAO.deleteProgrm(vo);
		}
	}

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?옄 Email ?뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageDtlVO selectRqesterEmail(ProgrmManageDtlVO vo) throws Exception{
       	return progrmManageDAO.selectRqesterEmail(vo);
	}


}
