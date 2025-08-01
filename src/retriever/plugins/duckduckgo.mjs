import { request } from 'undici'

export async function fetchDuckDuckGo (query, limit = 5) {
  const url =
    'https://ddg-webapp-search.vercel.app/api/search?q=' +
    encodeURIComponent(query) +
    '&max_results=' + limit

  const { body } = await request(url)
  const data     = await body.json()
  return data.results.slice(0, limit).map(r => ({
    title:   r.title,
    url:     r.url,
    snippet: r.snippet,
    date:    r.date
  }))
}

