package egovframework.com.uss.ion.rss.service.impl;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.uss.ion.rss.service.RssManage;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * RSS?쒓렇愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * 
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.16  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.10.18  ?쒖???         Altibase DB 泥섎━瑜??꾪븳 肄붾뱶 異붽?
 *   2018.10.22  ?좎슜??         connection close 愿???섏젙
 *   2018.12.05  ?좎슜??         selectRssTagManageTableList(),selectRssTagManageTableColumnList() ?뚯씠釉?紐⑸줉 ?붿씠?몃━?ㅽ듃 ?쒖빟
 *   2019.05.10  ?좎슜??         WhiteList 湲곕뒫 蹂댁셿
 *   2025.08.14  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.08.14  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.08.14  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SimplifyBooleanExpressions(boolean ?ъ슜 ??遺덊븘?뷀븳 鍮꾧탳 ?곗궛???쇳븯?꾨줉 ??
 *
 *      </pre>
 */
@Repository("rssManageDao")
public class RssTagManageDao extends EgovComAbstractDAO {

	// RSS???덉슜???뚯씠釉?紐⑸줉 - context-whitelist.xml?먯꽌 愿由?
	@Resource(name = "egovRSSWhitelist")
	protected List<String> tableWhiteList;

	/**
	 * JDBC ?뚯씠釉?紐⑸줉?꾩“?뚰븳??
	 * 
	 * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
	 * @throws Exception
	 */
	public List<ComDefaultCodeVO> selectRssTagManageTableList() throws Exception {

		String columnLabelTableName = "TABLE_NAME";
		String columnLabelTableSchema = "TABLE_SCHEM";
		String[] types = { "TABLE", "VIEW" };
		ArrayList<ComDefaultCodeVO> arrListResult = new ArrayList<ComDefaultCodeVO>();

		DatabaseMetaData dbmd = null;

		try (Connection conn = getSqlSession().getConnection();) {

			dbmd = conn.getMetaData();

			try (ResultSet tables = dbmd.getTables(null, null, null, types);) {
				while (tables.next()) {

					// KISA 蹂댁븞?쎌젏 議곗튂 (2018-12-05, ?좎슜??
					String tableName = tables.getString(columnLabelTableName);
					if (tableName == null) {
						tableName = "";
					}
					// WhiteList 湲곕뒫 蹂댁셿 (2019-05-10, ?좎슜??
					if (tableWhiteList.contains(tableName.toLowerCase())) {
						ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
						codeVO.setCode(tables.getString(columnLabelTableName));
						codeVO.setCodeNm(tables.getString(columnLabelTableSchema));
						arrListResult.add(codeVO);
					}
				}
			}
		}

		return arrListResult;

	}

	/**
	 * JDBC ?뚯씠釉?而щ읆 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param map - 而щ읆議고쉶?뺣낫
	 * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
	 * @throws Exception
	 */
	public List<Map<String, String>> selectRssTagManageTableColumnList(Map<String, String> map) throws Exception {

		String sTableName = map.get("tableName");
		String sDbType = map.get("dbType");
		String sSQL = "";
		ArrayList<Map<String, String>> arrListResult = new ArrayList<Map<String, String>>();

		PreparedStatement st = null;

		try (Connection conn = getSqlSession().getConnection();) {

			// KISA 蹂댁븞?쎌젏 議곗튂 (2018-12-05, ?좎슜??
			// WhiteList 湲곕뒫 蹂댁셿 (2019-05-10, ?좎슜??
			if (tableWhiteList.contains(sTableName.toLowerCase())) {

				if (sDbType.equals("mysql") || sDbType.equals("maria") || sDbType.equals("postgres")) {
					sSQL = "SELECT * FROM (sTableName) LIMIT 1 ";
					sSQL = sSQL.replace("(sTableName)", sTableName);

				} else {
					sSQL = "SELECT * FROM (sTableName) WHERE ROWNUM <= 1 ";
					sSQL = sSQL.replace("(sTableName)", sTableName);
				}

				if (!sDbType.equals("altibase")) {// 2011.10.18
					st = conn.prepareStatement(sSQL, ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_UPDATABLE);
				} else {
					st = conn.prepareStatement(sSQL);
				}

				try (ResultSet rs = st.executeQuery();) {

					ResultSetMetaData rsMetaData = rs.getMetaData();
					int numberOfColumns = rsMetaData == null ? 0 : rsMetaData.getColumnCount();

					for (int i = 1; i < numberOfColumns + 1; i++) {
						Map<String, String> hmResult = new HashMap<String, String>();
						hmResult.put("code",
								rsMetaData == null ? "" : EgovStringUtil.isNullToString(rsMetaData.getTableName(i)));
						hmResult.put("codeNm",
								rsMetaData == null ? "" : EgovStringUtil.isNullToString(rsMetaData.getColumnName(i)));

						arrListResult.add(hmResult);
					}
				}
			}
		}

		return arrListResult;
	}

	/**
	 * RSS?쒓렇愿由щ?(?? 紐⑸줉???쒕떎.
	 * 
	 * @param rssManage -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return -議고쉶?쒕ぉ濡앹씠?닿릿List
	 * @throws Exception
	 */
	public List<?> selectRssTagManageList(RssManage rssManage) throws Exception {
		return selectList("RssTagManage.selectRssTagManage", rssManage);

	}

	/**
	 * RSS?쒓렇愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * 
	 * @param rssManage -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return -議고쉶?쒓굔?섍??닿릿Integer
	 * @throws Exception
	 */
	public int selectRssTagManageListCnt(RssManage rssManage) throws Exception {
		return (Integer) selectOne("RssTagManage.selectRssTagManageCnt", rssManage);
	}

	/**
	 * RSS?쒓렇愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * 
	 * @param rssManage -RSS?쒓렇愿由??뺣낫媛 ?닿? 媛앹껜
	 * @return RssManage -RSS?쒓렇愿由??뺣낫媛 ?닿? 媛앹껜
	 * @throws Exception
	 */
	public RssManage selectRssTagManageDetail(RssManage rssManage) throws Exception {
		return (RssManage) selectOne("RssTagManage.selectRssTagManageDetail", rssManage);
	}

	/**
	 * RSS?쒓렇愿由щ?(?? ?깅줉?쒕떎.
	 * 
	 * @param rssManage -RSS?쒓렇愿由??뺣낫媛 ?닿? 媛앹껜
	 * @throws Exception
	 */
	public void insertRssTagManage(RssManage rssManage) throws Exception {
		insert("RssTagManage.insertRssTagManage", rssManage);
	}

	/**
	 * RSS?쒓렇愿由щ?(?? ?섏젙?쒕떎.
	 * 
	 * @param rssManage -RSS?쒓렇愿由??뺣낫媛 ?닿? 媛앹껜
	 * @throws Exception
	 */
	public void updateRssTagManage(RssManage rssManage) throws Exception {
		update("RssTagManage.updateRssTagManage", rssManage);
	}

	/**
	 * RSS?쒓렇愿由щ?(?? ??젣?쒕떎.
	 * 
	 * @param rssManage -RSS?쒓렇愿由??뺣낫媛 ?닿? 媛앹껜
	 * @throws Exception
	 */
	public void deleteRssTagManage(RssManage rssManage) throws Exception {
		delete("RssTagManage.deleteRssTagManage", rssManage);
	}

}
