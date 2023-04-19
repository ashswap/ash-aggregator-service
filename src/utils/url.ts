export const buildUrlParams = (
  query: Record<string, number | string | string[] | number[] | boolean>,
) => {
  const params = Object.entries(query)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return `${k}=${v.map((_) => _.toString()).join(',')}`;
      } else {
        return `${k}=${v}`;
      }
    })
    .join('&');
  return `?${params}`;
};
