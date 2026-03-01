package egovframework.com.utl.sys.fsm.service;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅 濡쒓렇?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅 濡쒓렇??紐⑸줉 ??ぉ, 議고쉶議곌굔 ?깆쓣 愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 */
@SuppressWarnings("serial")
public class FileSysMntrngLogVO extends FileSysMntrngLog {

	/** 寃?됱“嫄?*/
    private String searchCnd = "";

    /** 寃?됰떒??*/
    private String searchWrd = "";

    /** ?쒖옉?쇱옄 議고쉶議곌굔 */
    private String searchBgnDe = "";

    /** ?쒖옉?쒓컙 議고쉶議곌굔 */
    private String searchBgnHour = "";

    /** ?쒖옉?쇱떆 議고쉶議곌굔 */
    private String searchBgnDt = "";

    /** 醫낅즺?쇱옄 議고쉶議곌굔 */
    private String searchEndDe = "";

    /** 醫낅즺?쒓컙 議고쉶議곌굔 */
    private String searchEndHour = "";

    /** 醫낅즺?쇱떆 議고쉶議곌굔 */
    private String searchEndDt = "";

    /** ?꾩옱?섏씠吏 */
    private int pageIndex = 1;

    /** ?섏씠吏媛쒖닔 */
    private int pageUnit = 10;

    /** ?섏씠吏?ъ씠利?*/
    private int pageSize = 10;

    /** 泥ロ럹?댁? ?몃뜳??*/
    private int firstIndex = 1;

    /** 留덉?留됲럹?댁? ?몃뜳??*/
    private int lastIndex = 1;

    /** ?섏씠吏???덉퐫??媛쒖닔 */
    private int recordCountPerPage = 10;

	/**
	 * 寃??議곌굔 諛섑솚
	 */
	public String getSearchCnd() {
		return searchCnd;
	}

	/**
	 * 寃??議곌굔 ?ㅼ젙
	 */
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * 寃?됱뼱 諛섑솚
	 */
	public String getSearchWrd() {
		return searchWrd;
	}

	/**
	 * 寃?됱뼱 ?ㅼ젙
	 */
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * 寃???쒖옉??諛섑솚
	 */
	public String getSearchBgnDe() {
		return searchBgnDe;
	}

	/**
	 * 寃???쒖옉???ㅼ젙
	 */
	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	/**
	 * 寃???쒖옉 ?쒓컙 諛섑솚
	 */
	public String getSearchBgnHour() {
		return searchBgnHour;
	}

	/**
	 * 寃???쒖옉 ?쒓컙 ?ㅼ젙
	 */
	public void setSearchBgnHour(String searchBgnHour) {
		this.searchBgnHour = searchBgnHour;
	}

	/**
	 * 寃???쒖옉 ?쇱떆 諛섑솚
	 */
	public String getSearchBgnDt() {
		return searchBgnDt;
	}

	/**
	 * 寃???쒖옉 ?쇱떆 ?ㅼ젙
	 */
	public void setSearchBgnDt(String searchBgnDt) {
		this.searchBgnDt = searchBgnDt;
	}

	/**
	 * 寃??醫낅즺??諛섑솚
	 */
	public String getSearchEndDe() {
		return searchEndDe;
	}

	/**
	 * 寃??醫낅즺???ㅼ젙
	 */
	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	/**
	 * 寃??醫낅즺 ?쒓컙 諛섑솚
	 */
	public String getSearchEndHour() {
		return searchEndHour;
	}

	/**
	 * 寃??醫낅즺 ?쒓컙 ?ㅼ젙
	 */
	public void setSearchEndHour(String searchEndHour) {
		this.searchEndHour = searchEndHour;
	}

	/**
	 * 寃??醫낅즺 ?쇱떆 諛섑솚
	 */
	public String getSearchEndDt() {
		return searchEndDt;
	}

	/**
	 * 寃??醫낅즺 ?쇱떆 ?ㅼ젙
	 */
	public void setSearchEndDt(String searchEndDt) {
		this.searchEndDt = searchEndDt;
	}

	/**
	 * ?섏씠吏 ?몃뜳??諛섑솚
	 */
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * ?섏씠吏 ?몃뜳???ㅼ젙
	 */
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * ?섏씠吏 ?⑥쐞 諛섑솚
	 */
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * ?섏씠吏 ?⑥쐞 ?ㅼ젙
	 */
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * ?섏씠吏 ?ш린 諛섑솚
	 */
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * ?섏씠吏 ?ш린 ?ㅼ젙
	 */
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * 泥??섏씠吏 ?몃뜳??諛섑솚
	 */
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * 泥??섏씠吏 ?몃뜳???ㅼ젙
	 */
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * 留덉?留??섏씠吏 ?몃뜳??諛섑솚
	 */
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * 留덉?留??섏씠吏 ?몃뜳???ㅼ젙
	 */
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * ?섏씠吏???덉퐫????諛섑솚
	 */
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * ?섏씠吏???덉퐫?????ㅼ젙
	 */
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}



}
