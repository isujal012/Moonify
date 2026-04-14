const fetch = require('node-fetch');

async function debugAPI() {
  const url = 'https://saavn.sumit.co/api/search?query=trending';
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data.data?.songs?.results?.[0], null, 2));
  } catch (err) {
    console.error(err);
  }
}

debugAPI();
