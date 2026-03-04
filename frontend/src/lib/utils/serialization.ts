/**
 * 클라이언트 컴포넌트로 전달하기 전 서버 데이터를 필요한 필드만 남기고 정리합니다.
 * (Server Serialization Optimization)
 */
export function selectFields<T extends object, K extends keyof T>(
    data: T,
    fields: K[]
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;
    fields.forEach((field) => {
      if (field in data) {
        result[field] = data[field];
      }
    });
    return result;
  }

  export function selectFieldsList<T extends object, K extends keyof T>(
    dataList: T[],
    fields: K[]
  ): Pick<T, K>[] {
    return dataList.map((item) => selectFields(item, fields));
  }
