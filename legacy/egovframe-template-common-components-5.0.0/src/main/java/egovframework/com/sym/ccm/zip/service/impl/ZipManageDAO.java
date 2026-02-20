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
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("ZipManageDAO")
public class ZipManageDAO extends EgovComAbstractDAO {

	/**
	 * ?고렪踰덊샇瑜???젣?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void deleteZip(Zip zip) throws Exception {
		delete("ZipManageDAO.deleteZip", zip);
	}

	/**
	 * ?고렪踰덊샇 ?꾩껜瑜???젣?쒕떎.
	 * @throws Exception
	 */
	public void deleteAllZip() throws Exception {
		delete("ZipManageDAO.deleteAllZip", new Object());
	}

	/**
	 * ?고렪踰덊샇瑜??깅줉?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void insertZip(Zip zip) {
        insert("ZipManageDAO.insertZip", zip);
	}

	/**
	 * ?고렪踰덊샇 ?묒??뚯씪???깅줉?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void insertExcelZip() throws Exception {
		delete("ZipManageDAO.deleteAllZip", new Object());
	}


	/**
	 * ?고렪踰덊샇 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param zip
	 * @return Zip(?고렪踰덊샇)
	 */
	public Zip selectZipDetail(Zip zip) throws Exception {
		return (Zip) selectOne("ZipManageDAO.selectZipDetail", zip);
	}


    /**
	 * ?고렪踰덊샇 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(?고렪踰덊샇 紐⑸줉)
     * @throws Exception
     */
	public List<EgovMap> selectZipList(ZipVO searchVO) throws Exception {
        return selectList("ZipManageDAO.selectZipList", searchVO);
    }

    /**
	 * ?고렪踰덊샇 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?고렪踰덊샇 珥?媛쒖닔)
     */
    public int selectZipListTotCnt(ZipVO searchVO) throws Exception {
        return (Integer)selectOne("ZipManageDAO.selectZipListTotCnt", searchVO);
    }

	/**
	 * ?고렪踰덊샇瑜??섏젙?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	public void updateZip(Zip zip) throws Exception {
		update("ZipManageDAO.updateZip", zip);
	}

}
