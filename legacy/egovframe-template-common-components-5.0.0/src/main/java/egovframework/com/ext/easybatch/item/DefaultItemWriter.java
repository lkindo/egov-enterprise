/*
 * eGovFrame Easy Batch
 * Copyright The eGovFrame Open Community (http://open.egovframe.go.kr)).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author ?쒓꼍???덊띁媛쒕컻?륦3)
 */
package egovframework.com.ext.easybatch.item;

import javax.sql.DataSource;

import org.egovframe.rte.bat.core.item.database.EgovJdbcBatchItemWriter;
import org.egovframe.rte.bat.core.item.database.support.EgovMethodMapItemPreparedStatementSetter;
import org.egovframe.rte.bat.core.item.file.transform.EgovFieldExtractor;
import org.egovframe.rte.bat.core.item.file.transform.EgovFixedLengthLineAggregator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.StepExecution;
import org.springframework.batch.core.annotation.BeforeStep;
import org.springframework.batch.item.Chunk;
import org.springframework.batch.item.ExecutionContext;
import org.springframework.batch.item.ItemStream;
import org.springframework.batch.item.ItemStreamException;
import org.springframework.batch.item.ItemStreamWriter;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.file.FlatFileItemWriter;
import org.springframework.batch.item.file.transform.DelimitedLineAggregator;
import org.springframework.batch.item.file.transform.FieldExtractor;
import org.springframework.batch.item.file.transform.LineAggregator;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.WritableResource;

/**
 * @author ?쒓꼍??
 * @since 2014.11.05
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??       ?섏젙??          ?섏젙?댁슜
 *  -------       --------          ---------------------------
 *   2014.11.05    ?쒓꼍??          理쒖큹 ?앹꽦
 *   2014.11.28    ?쒖??꾨젅?꾩썙??怨듯넻而댄룷?뚰듃 異붽? ?곸슜 (?⑦궎吏 蹂寃?
 *
 * </pre>
 */
public class DefaultItemWriter<T> implements ItemStreamWriter<T> {

	private static final Logger LOGGER = LoggerFactory.getLogger(DefaultItemWriter.class);

	// Output Resource Type - key
	private static final String XML_CONF_FLAG_KEY = ".writer.xml.conf.flag";

	private static final String WRITER_RESOURCE_TYPE_KEY = ".writer.resource.type";

	private static final String WRITER_RESOURCE_NAME_KEY = ".writer.resource.name";
	private static final String WRITER_FIELD_NAMES_KEY = ".writer.field.names";
	private static final String WRITER_FIELD_RANGES_KEY = ".writer.field.ranges";
	private static final String WRITER_DELIMITER_KEY = ".writer.delimiter";

	private static final String WRITER_SQL_KEY = ".writer.sql";
	private static final String WRITER_PARAMS_KEY = ".writer.params";

	// Output Resource Type - Value
	private static final String DELIMITED_FILE_TYPE = "delimitedFile";
	private static final String FIXED_LENGTH_FILE_TYPE = "fixedLengthFile";
	private static final String JDBC_DB_TYPE = "jdbcDb";

	// XML ?ㅼ젙 ?댁슜??異쒕젰?섍린 ?꾪븳 ?ㅼ젙
	boolean printXmlConf = false;

	// ?ㅼ젣 ?숈옉?섎뒗 Reader
	private ItemWriter<T> writer;

	// 怨듯넻 ?ㅼ젙
	private String stepName;
	private JobParameters jobParameters;
	private String writerResourceType;

	// File ?낅젰??寃쎌슦 ?ъ슜?섎뒗 ?ㅼ젙
	private Resource resource; // 怨듯넻
	private String resourceName; // 怨듯넻
	private String[] fieldNames; // 怨듯넻
	private String names; // 怨듯넻
	private String delimiter; // delimited 諛⑹떇??寃쎌슦
	private int[] fieldRanges; // fixedLength 諛⑹떇??寃쎌슦
	private String ranges;

	// DB ?낅젰??寃쎌슦 ?ъ슜?섎뒗 ?ㅼ젙
	private DataSource dataSource;
	private String sql;
	private String[] params;
	private String tempParams;

	public void setDataSource(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@BeforeStep
	public void beforeStep(StepExecution stepExecution) throws ClassNotFoundException {
		this.stepName = stepExecution.getStepName();
		this.jobParameters = stepExecution.getJobParameters();

		String flag = jobParameters.getString(stepName + XML_CONF_FLAG_KEY);
		if ((flag != null) && "true".equalsIgnoreCase(flag)) {
			printXmlConf = true;
		}

		// Input Resource Type???곕씪 ?꾩슂???ㅼ젙 媛??명똿
		makeWriterConfigValue();
	}

	@Override
	public void open(ExecutionContext executionContext)
		throws ItemStreamException {
		// ItemReader ?앹꽦
		makeItemWriter();

		if (this.writer instanceof ItemStream) {
			((ItemStream)this.writer).open(executionContext);
		}
	}

	@Override
	public void update(ExecutionContext executionContext)
		throws ItemStreamException {
		if (this.writer instanceof ItemStream) {
			((ItemStream)this.writer).update(executionContext);
		}
	}

	@Override
	public void close() throws ItemStreamException {
		if (this.writer instanceof ItemStream) {
			((ItemStream)this.writer).close();
		}
	}

	@Override
    public void write(Chunk<? extends T> chunk) throws Exception {
        this.writer.write(chunk);
    }

	private void makeWriterConfigValue() {
		if (jobParameters.getString(stepName + WRITER_RESOURCE_TYPE_KEY) != null) {
			this.writerResourceType = jobParameters.getString(stepName + WRITER_RESOURCE_TYPE_KEY);

			if (DELIMITED_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)
				|| FIXED_LENGTH_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)) {

				// ?낅젰 由ъ냼?ㅺ? File??寃쎌슦 怨듯넻 泥섎━ 遺遺?
				this.resourceName = jobParameters.getString(stepName + WRITER_RESOURCE_NAME_KEY);
				this.names = jobParameters.getString(stepName + WRITER_FIELD_NAMES_KEY);

				if (DELIMITED_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)) {
					this.delimiter = jobParameters.getString(stepName + WRITER_DELIMITER_KEY);
					if (this.resourceName == null || this.delimiter == null || this.names == null) {
						throw new RuntimeException(
							stepName + "?ㅽ뀦??Writer ?ㅼ젙?먯꽌 resourceName, delimiter, names???꾩닔?낅땲?? ?ㅼ쓬 泥섎읆 ?ㅼ젙?섏꽭??\n"
								+ stepName + ".writer.resourceName=file:./inputs/csvData.csv " + stepName
								+ ".writer.delimiter=, " + stepName + ".writer.fieldNames=name,age ");
					}
				} else {
					this.ranges = jobParameters.getString(stepName + WRITER_FIELD_RANGES_KEY);
					if (this.resourceName == null || ranges == null || this.names == null) {
						throw new RuntimeException(
							stepName + "?ㅽ뀦??Reader ?ㅼ젙?먯꽌 resourceName, fieldRanges, names???꾩닔?낅땲?? ?ㅼ쓬 泥섎읆 ?ㅼ젙?섏꽭??\n"
								+ stepName + ".writer.resourceName=file:./target/test-outputs/txtOutput.txt " + stepName
								+ ".writer.fieldRanges=9,2 " + stepName + ".writer.fieldNames=name,age ");
					}

					String[] rangeArray = ranges.split(",");
					this.fieldRanges = new int[rangeArray.length];
					for (int idx = 0; idx < rangeArray.length; idx++) {
						fieldRanges[idx] = Integer.parseInt(rangeArray[idx]);
					}
				}

				this.resource = new FileSystemResource(resourceName);
				this.fieldNames = names.split(",");

			} else if (JDBC_DB_TYPE.equalsIgnoreCase(this.writerResourceType)) {
				this.sql = jobParameters.getString(stepName + WRITER_SQL_KEY);
				tempParams = jobParameters.getString(stepName + WRITER_PARAMS_KEY);

				if (this.sql == null || tempParams == null) {
					throw new RuntimeException(stepName + "?ㅽ뀦??Writer ?ㅼ젙?먯꽌 sql, params???꾩닔?낅땲?? ?ㅼ쓬 泥섎읆 ?ㅼ젙?섏꽭??\n"
						+ stepName + ".writer.sql=UPDATE CUSTOMER set credit =? where name =? " + stepName
						+ ".writer.params=credit,name ");
				}

				this.params = tempParams.split(",");
			}

		} else {
			throw new RuntimeException(stepName + ".writerResourceType=delimitedFile'泥섎읆, 異쒕젰 由ъ냼????낆쓣 Job ?뚮씪誘명꽣濡??낅젰?섏꽭??\n"
				+ "由ъ냼?????醫낅쪟) delimitedFile, fixedLengthFile, jdbcDb");
		}
	}

	private DelimitedLineAggregator<T> makeDelimitedLineAggregator(FieldExtractor<T> fieldExtractor) {
		DelimitedLineAggregator<T> lineAggregator = new DelimitedLineAggregator<>();
		lineAggregator.setDelimiter(this.delimiter);
		lineAggregator.setFieldExtractor(fieldExtractor);
		return lineAggregator;
	}

	private EgovFixedLengthLineAggregator<T> makeEgovFixedLengthLineAggregator(FieldExtractor<T> fieldExtractor) {
		EgovFixedLengthLineAggregator<T> lineAggregator = new EgovFixedLengthLineAggregator<>();
		lineAggregator.setFieldExtractor(fieldExtractor);
		lineAggregator.setFieldRanges(fieldRanges);
		return lineAggregator;
	}

	private FieldExtractor<T> makeFieldExtractor() {
		EgovFieldExtractor<T> fieldExtractor = new EgovFieldExtractor<>();
		fieldExtractor.setNames(this.fieldNames);
		fieldExtractor.afterPropertiesSet();
		return fieldExtractor;
	}

	private void makeItemWriter() {
		if (DELIMITED_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)
			|| FIXED_LENGTH_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)) {

			FieldExtractor<T> fieldExtractor = makeFieldExtractor();

			LineAggregator<T> lineAggregator = null;

			if (DELIMITED_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)) {
				lineAggregator = makeDelimitedLineAggregator(fieldExtractor);
			} else {
				lineAggregator = makeEgovFixedLengthLineAggregator(fieldExtractor);
			}

			this.writer = new FlatFileItemWriter<>();
			((FlatFileItemWriter<T>)this.writer).setResource((WritableResource) this.resource);
			((FlatFileItemWriter<T>)this.writer).setLineAggregator(lineAggregator);

			try {
				((FlatFileItemWriter<T>)this.writer).afterPropertiesSet();
			} catch (Exception e) {
				throw new RuntimeException(
					this.writerResourceType + " ??낆쓽 File??write ?섍린 ?꾪븳 FlatFileItemWriter ?앹꽦???ㅽ뙣 ?섏??듬땲??");
			}
		} else if (JDBC_DB_TYPE.equalsIgnoreCase(this.writerResourceType)) {

			EgovMethodMapItemPreparedStatementSetter<T> preparedStatementSetter = new EgovMethodMapItemPreparedStatementSetter<>();

			this.writer = new EgovJdbcBatchItemWriter<>();
			((EgovJdbcBatchItemWriter<T>)this.writer).setDataSource(this.dataSource);
			((EgovJdbcBatchItemWriter<T>)this.writer).setParams(this.params);
			((EgovJdbcBatchItemWriter<T>)this.writer).setSql(this.sql);
			((EgovJdbcBatchItemWriter<T>)this.writer).setItemPreparedStatementSetter(preparedStatementSetter);
			((EgovJdbcBatchItemWriter<T>)this.writer).setAssertUpdates(true);
			((EgovJdbcBatchItemWriter<T>)this.writer).afterPropertiesSet();
		}

		printXmlConfig();
	}

	private void printXmlConfig() {
		if (printXmlConf) {
			if (DELIMITED_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)) {
				LOGGER.info("======= " + stepName + " WRITER ?ㅼ젙(XML 踰꾩쟾) =========\n"
					+ "<bean id=\"" + stepName
					+ ".writer\" class=\"org.springframework.batch.item.file.FlatFileItemWriter\" scope=\"step\">\n"
					+ "  <property name=\"resource\" value=\"" + this.resourceName + "\" />\n"
					+ "  <property name=\"lineAggregator\">\n"
					+ "    <bean class=\"org.springframework.batch.item.file.transform.DelimitedLineAggregator\">\n"
					+ "      <property name=\"delimiter\" value=\"" + this.delimiter + "\" />\n"
					+ "      <property name=\"fieldExtractor\">\n"
					+ "        <bean class=\"org.egovframe.rte.bat.core.item.file.transform.EgovFieldExtractor\">\n"
					+ "          <property name=\"names\" value=\"" + this.names + "\" />\n"
					+ "        </bean>\n"
					+ "      </property>\n"
					+ "    </bean>\n"
					+ "  </property>\n"
					+ "</bean>\n"
					+ "================================================");
			} else if (FIXED_LENGTH_FILE_TYPE.equalsIgnoreCase(this.writerResourceType)) {
				LOGGER.info("======= " + stepName + " Writer ?ㅼ젙(XML 踰꾩쟾) =========\n"
					+ "<bean id=\"" + stepName
					+ ".writer\" class=\"org.springframework.batch.item.file.FlatFileItemWriter\" scope=\"step\">\n"
					+ "  <property name=\"resource\" value=\"" + this.resourceName + "\" />\n"
					+ "  <property name=\"lineAggregator\">\n"
					+ "    <bean class=\"org.egovframe.rte.bat.core.item.file.transform.EgovFixedLengthLineAggregator\">\n"
					+ "      <property name=\"fieldRanges\" value=\"" + this.ranges + "\" />\n"
					+ "      <property name=\"fieldExtractor\">\n"
					+ "        <bean class=\"org.egovframe.rte.bat.core.item.file.transform.EgovFieldExtractor\">\n"
					+ "          <property name=\"names\" value=\"" + this.names + "\" />\n"
					+ "        </bean>\n"
					+ "      </property>\n"
					+ "    </bean>\n"
					+ "  </property>\n"
					+ "</bean>\n"
					+ "================================================");
			} else if (JDBC_DB_TYPE.equalsIgnoreCase(this.writerResourceType)) {
				LOGGER.info("======= " + stepName + " Writer ?ㅼ젙(XML 踰꾩쟾) =========\n"
					+ "<bean id=\"" + stepName
					+ ".writer\" class=\"org.egovframe.rte.bat.core.item.database.EgovJdbcBatchItemWriter\">\n"
					+ "  <property name=\"assertUpdates\" value=\"true\" />\n"
					+ "  <property name=\"itemPreparedStatementSetter\">\n"
					+ "    <bean class=\"org.egovframe.rte.bat.core.item.database.support.EgovMethodMapItemPreparedStatementSetter\" />\n"
					+ "  </property>\n"
					+ "  <property name=\"sql\" value=\"" + this.sql + "\" />\n"
					+ "  <property name=\"params\" value=\"" + this.tempParams + "\" />\n"
					+ "  <property name=\"dataSource\" ref=\"dataSource\" />\n"
					+ "</bean>\n"
					+ "================================================");
			}
		}
	}
}
