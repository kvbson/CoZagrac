export const getFilledSql = (dbQuery: any) => {
  const s = dbQuery.toSQL();

  const fullSql = s.sql.replace(/\$(\d+)/g, (_: any, n: any) => {
    const value = s.params[Number(n) - 1];

    if (value === null) return 'NULL';
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') return String(value);

    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  });
  return fullSql(s);
};
