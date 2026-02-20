package egovframework.com.sym.ccm.zip.service.impl;

import java.io.InputStream;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.sym.ccm.zip.service.EgovCcmZipManageService;
import egovframework.com.sym.ccm.zip.service.Zip;
import egovframework.com.sym.ccm.zip.service.ZipVO;
import jakarta.annotation.Resource;

/**
 *
 * ?고렪踰덊샇??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎
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
 *   2011.11.22  ?닿린??         ?묒??낅줈???쒖옉?꾩튂 ?섏젙(2 -> 1)
 *
 * </pre>
 */
@Service("ZipManageService")
public class EgovCcmZipManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmZipManageService {

    @Resource(name="ZipManageDAO")
    private ZipManageDAO zipManageDAO;

    @Resource(name = "excelZipService")
    private EgovExcelService excelZipService;

	/**
	 * ?고렪踰덊샇瑜???젣?쒕떎.
	 */
	@Override
	public void deleteZip(Zip zip) throws Exception {
		zipManageDAO.deleteZip(zip);
	}

	/**
	 * ?고렪踰덊샇 ?꾩껜瑜???젣?쒕떎.
	 */
	@Override
	public void deleteAllZip() throws Exception {
		zipManageDAO.deleteAllZip();
	}

	/**
	 * ?고렪踰덊샇瑜??깅줉?쒕떎.
	 */
	@Override
	public void insertZip(Zip zip) {
    	zipManageDAO.insertZip(zip);
	}

	/**
	 * ?고렪踰덊샇 ?묒??뚯씪???깅줉?쒕떎.
	 * @param zip
	 * @throws Exception
	 */
	@Override
	public void insertExcelZip(InputStream file) throws Exception {
		zipManageDAO.insertExcelZip();
		excelZipService.uploadExcel("ZipManageDAO.insertExcelZip", file, 1, 5000);
	}

	/**
	 * ?고렪踰덊샇 ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public Zip selectZipDetail(Zip zip) throws Exception {
    	Zip ret = zipManageDAO.selectZipDetail(zip);
    	return ret;
	}

	/**
	 * ?고렪踰덊샇 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectZipList(ZipVO searchVO) throws Exception {
        return zipManageDAO.selectZipList(searchVO);
	}

	/**
	 * ?고렪踰덊샇 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectZipListTotCnt(ZipVO searchVO) throws Exception {
        return zipManageDAO.selectZipListTotCnt(searchVO);
	}

	/**
	 * ?고렪踰덊샇瑜??섏젙?쒕떎.
	 */
	@Override
	public void updateZip(Zip zip) throws Exception {
		zipManageDAO.updateZip(zip);
	}

}
