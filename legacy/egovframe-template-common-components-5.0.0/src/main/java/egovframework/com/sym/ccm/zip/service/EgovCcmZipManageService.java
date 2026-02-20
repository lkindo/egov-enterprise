package egovframework.com.sym.ccm.zip.service;

import java.io.InputStream;
import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;


/**
 *
 * ?고렪踰덊샇??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovCcmZipManageService {

	/**
	 * ?고렪踰덊샇瑜???젣?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	void deleteZip(Zip zip) throws Exception;

	/**
	 * ?고렪踰덊샇 ?꾩껜瑜???젣?쒕떎.
	 * @throws Exception
	 */
	void deleteAllZip() throws Exception;

	/**
	 * ?고렪踰덊샇瑜??깅줉?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	void insertZip(Zip zip);

	/**
	 * ?고렪踰덊샇 ?묒??뚯씪???깅줉?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	void insertExcelZip(InputStream file) throws Exception;

	/**
	 * ?고렪踰덊샇 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param zip
	 * @return Zip(?고렪踰덊샇)
	 * @throws Exception
	 */
	Zip selectZipDetail(Zip zip) throws Exception;

	/**
	 * ?고렪踰덊샇 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?고렪踰덊샇 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectZipList(ZipVO searchVO) throws Exception;

    /**
	 * ?고렪踰덊샇 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?고렪踰덊샇 珥?媛쒖닔)
     */
    int selectZipListTotCnt(ZipVO searchVO) throws Exception;

	/**
	 * ?고렪踰덊샇瑜??섏젙?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	void updateZip(Zip zip) throws Exception;

}
