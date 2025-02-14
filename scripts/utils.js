const isSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const transformEmptyRow = (data, headers) => {
  data.map((row) => {
    if (row.length < headers.length) {
      for (let i = row.length; i < headers.length; i += 1) {
        row.push('');
      }
    }
    return null;
  });
  return data;
};

export { isSame, transformEmptyRow };
