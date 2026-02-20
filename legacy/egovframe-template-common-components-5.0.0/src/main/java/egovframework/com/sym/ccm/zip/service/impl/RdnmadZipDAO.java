package egovframework.com.sym.ccm.zip.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.ccm.zip.service.Zip;
import egovframework.com.sym.ccm.zip.service.ZipVO;

/**
 *
 * ?고렪踰덊샇??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?닿린??
 * @since 2011.11.21
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *     ?섏젙??     	?섏젙??          ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2011.11.21		?닿린??          ?꾨줈紐낆＜??理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("RdnmadZipDAO")
public class RdnmadZipDAO extends EgovComAbstractDAO {

	/**
	 * ?고렪踰덊샇瑜???젣?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void deleteZip(Zip zip) throws Exception {
		delete("RdnmadZipDAO.deleteZip", zip);
	}

	/**
	 * ?고렪踰덊샇 ?꾩껜瑜???젣?쒕떎.
	 * @throws Exception
	 */
	public void deleteAllZip() throws Exception {
		delete("RdnmadZipDAO.deleteAllZip", new Object());
	}

	/**
	 * ?고렪踰덊샇瑜??깅줉?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void insertZip(Zip zip) {
        insert("RdnmadZipDAO.insertZip", zip);
	}

	/**
	 * ?고렪踰덊샇 ?묒??뚯씪???깅줉?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void insertExcelZip() throws Exception {
		delete("RdnmadZipDAO.deleteAllZip", new Object());
	}


	/**
	 * ?고렪踰덊샇 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param zip
	 * @return Zip(?고렪踰덊샇)
	 */
	public Zip selectZipDetail(Zip zip) throws Exception {
		return (Zip) selectOne("RdnmadZipDAO.selectZipDetail", zip);
	}


    /**
	 * ?고렪踰덊샇 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(?고렪踰덊샇 紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectZipList(ZipVO searchVO) throws Exception {
        return selectList("RdnmadZipDAO.selectZipList", searchVO);
    }

    /**
	 * ?고렪踰덊샇 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?고렪踰덊샇 珥?媛쒖닔)
     */
    public int selectZipListTotCnt(ZipVO searchVO) throws Exception {
        return (Integer)selectOne("RdnmadZipDAO.selectZipListTotCnt", searchVO);
    }

	/**
	 * ?고렪踰덊샇瑜??섏젙?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void updateZip(Zip zip) throws Exception {
		update("RdnmadZipDAO.updateZip", zip);
	}

}
